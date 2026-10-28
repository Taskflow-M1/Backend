import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import { env } from '../src/config/env';
import { clearVerificationStoreForTests } from '../src/modules/auth/email-verification.store';
import {
  setVerificationEmailTransportForTests,
  VerificationEmailPayload,
  VerificationEmailTransport,
} from '../src/modules/auth/verification-email.service';
import { UserModel } from '../src/modules/users/user.model';
import {
  clearTestDatabase,
  registerTestAccount,
  setupTestDatabase,
  teardownTestDatabase,
} from './helpers/test-db';

class CapturingEmailTransport implements VerificationEmailTransport {
  public readonly sent: VerificationEmailPayload[] = [];

  async send(payload: VerificationEmailPayload): Promise<void> {
    this.sent.push(payload);
  }
}

function codeFrom(payload: VerificationEmailPayload): string {
  const match = payload.text.match(/code de vérification est : (\d{4})/);
  if (!match) {
    throw new Error('Verification code missing from test email');
  }
  return match[1];
}

describe('Email verification registration flow', () => {
  let emailTransport: CapturingEmailTransport;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    clearVerificationStoreForTests();
    emailTransport = new CapturingEmailTransport();
    setVerificationEmailTransportForTests(emailTransport);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    clearVerificationStoreForTests();
    setVerificationEmailTransportForTests();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  async function sendCode(
    email: string,
    firstName?: string,
  ): Promise<string> {
    const response = await request(app)
      .post('/api/auth/send-verification-code')
      .send({ email, ...(firstName ? { firstName } : {}) });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: expect.any(String),
      expiresInSeconds: env.emailVerificationTtlMinutes * 60,
      cooldownSeconds: 60,
    });
    expect(emailTransport.sent).toHaveLength(1);
    return codeFrom(emailTransport.sent[0]);
  }

  it('generates a four-digit code and sends the branded HTML/text email with an inline CID logo', async () => {
    const code = await sendCode('alice@example.test', 'Alice');
    const email = emailTransport.sent[0];

    expect(code).toMatch(/^\d{4}$/);
    expect(email.to).toBe('alice@example.test');
    expect(email.from).toBe(env.resendFromEmail);
    expect(email.html).toContain('Bonjour Alice');
    expect(email.html).toContain('cid:taskflow-logo');
    expect(email.html).toContain('Confirmez votre adresse e-mail');
    expect(email.text).toContain(code);
    expect(email.attachments).toEqual([
      expect.objectContaining({
        filename: 'taskflow-butterfly.png',
        contentId: 'taskflow-logo',
        contentType: 'image/png',
        content: expect.any(Buffer),
      }),
    ]);
  });

  it('starts registration by emailing a code without creating a user or returning a token', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'register@example.test',
      password: 'MotDePasse123!',
      firstName: 'Nora',
      lastName: 'Petit',
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeUndefined();
    expect(response.body.user).toBeUndefined();
    expect(response.body.message).toEqual(expect.any(String));
    expect(await UserModel.countDocuments()).toBe(0);
    expect(emailTransport.sent).toHaveLength(1);

    const code = codeFrom(emailTransport.sent[0]);
    const verification = await request(app)
      .post('/api/auth/verify-email-code')
      .send({
        email: 'register@example.test',
        code,
        password: 'MotDePasse123!',
        firstName: 'Nora',
        lastName: 'Petit',
      });

    expect(verification.status).toBe(201);
    expect(verification.body.user.email).toBe('register@example.test');
    expect(typeof verification.body.token).toBe('string');
  });

  it('validates the code, consumes it, creates the user and returns the standard auth response', async () => {
    const email = 'new-user@example.test';
    const code = await sendCode(email, 'Lina');

    const verification = await request(app)
      .post('/api/auth/verify-email-code')
      .send({
        email,
        code,
        password: 'MotDePasse123!',
        firstName: 'Lina',
        lastName: 'Martin',
      });

    expect(verification.status).toBe(201);
    expect(verification.body.user.email).toBe(email);
    expect(verification.body.user.firstName).toBe('Lina');
    expect(typeof verification.body.token).toBe('string');

    const replay = await request(app)
      .post('/api/auth/verify-email-code')
      .send({ email, code, password: 'MotDePasse123!' });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a wrong code and invalidates the entry after five failed attempts', async () => {
    const email = 'attempts@example.test';
    const validCode = await sendCode(email);
    const wrongCode = validCode === '0000' ? '9999' : '0000';

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await request(app)
        .post('/api/auth/verify-email-code')
        .send({ email, code: wrongCode, password: 'MotDePasse123!' });
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    }

    const afterLockout = await request(app)
      .post('/api/auth/verify-email-code')
      .send({ email, code: validCode, password: 'MotDePasse123!' });
    expect(afterLockout.status).toBe(401);
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it('rejects an expired code', async () => {
    const baseTime = Date.now();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(baseTime);
    const email = 'expired@example.test';
    const code = await sendCode(email);

    nowSpy.mockReturnValue(
      baseTime + env.emailVerificationTtlMinutes * 60_000 + 1,
    );
    const response = await request(app)
      .post('/api/auth/verify-email-code')
      .send({ email, code, password: 'MotDePasse123!' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it('enforces the per-address 60-second resend cooldown', async () => {
    await sendCode('cooldown@example.test');

    const resend = await request(app)
      .post('/api/auth/send-verification-code')
      .send({ email: 'cooldown@example.test' });

    expect(resend.status).toBe(429);
    expect(resend.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(emailTransport.sent).toHaveLength(1);
  });

  it('rejects already-used addresses before sending any email', async () => {
    await registerTestAccount('member@example.test');

    const response = await request(app)
      .post('/api/auth/send-verification-code')
      .send({ email: 'MEMBER@example.test' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_ALREADY_USED');
    expect(emailTransport.sent).toHaveLength(0);
  });

  it('stores no OTP field or verification collection in MongoDB', async () => {
    const email = 'memory-only@example.test';
    const code = await sendCode(email);

    expect(await UserModel.countDocuments()).toBe(0);

    await request(app).post('/api/auth/verify-email-code').send({
      email,
      code,
      password: 'MotDePasse123!',
    });

    const storedUser = await UserModel.findOne({ email })
      .select('+passwordHash')
      .lean();
    expect(storedUser).toBeTruthy();
    expect(storedUser).not.toHaveProperty('code');
    expect(storedUser).not.toHaveProperty('otp');
    expect(storedUser).not.toHaveProperty('verificationCode');

    const collections = await mongoose.connection.db
      ?.listCollections()
      .toArray();
    const collectionNames = (collections ?? []).map(({ name }) => name);
    expect(collectionNames).not.toEqual(
      expect.arrayContaining([
        'otps',
        'verificationcodes',
        'emailverifications',
      ]),
    );
  });
});
