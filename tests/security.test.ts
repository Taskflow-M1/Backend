import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app';
import { env } from '../src/config/env';
import { errorMiddleware } from '../src/middlewares/error.middleware';
import { createRateLimiter } from '../src/middlewares/rate-limit.middleware';
import { UserModel } from '../src/modules/users/user.model';
import {
  clearTestDatabase,
  registerTestAccount,
  setupTestDatabase,
  teardownTestDatabase,
} from './helpers/test-db';

describe('Security Controls (Headers, CORS, JWT Integrity, Payload Limits & Rate Limiting)', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('sets Helmet security headers, hides X-Powered-By, and enforces configured CORS origins', async () => {
    const allowedOrigin = env.corsOrigins[0];

    const allowedRes = await request(app)
      .get('/api/health')
      .set('Origin', allowedOrigin);

    expect(allowedRes.status).toBe(200);
    expect(allowedRes.headers['x-powered-by']).toBeUndefined();
    expect(allowedRes.headers['x-content-type-options']).toBe('nosniff');
    expect(allowedRes.headers['access-control-allow-origin']).toBe(
      allowedOrigin,
    );

    const blockedRes = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil-attacker.example');
    expect(blockedRes.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('handles malformed JSON, oversized payloads (>250kb), and unknown routes without leaking stack traces', async () => {
    const malformedRes = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":"broken-json"');
    expect(malformedRes.status).toBe(400);
    expect(malformedRes.body.error.code).toBe('INVALID_INPUT');
    expect(JSON.stringify(malformedRes.body)).not.toContain('SyntaxError');

    const hugePayload = { title: 'A'.repeat(300_000) };
    const tooLargeRes = await request(app)
      .post('/api/auth/login')
      .send(hugePayload);
    expect(tooLargeRes.status).toBe(400);
    expect(tooLargeRes.body.error.code).toBe('INVALID_INPUT');

    const notFoundRes = await request(app).get('/api/non-existent-endpoint');
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects forged JWTs, alg:none tokens, expired tokens, and tokens of deleted accounts with 401 UNAUTHORIZED', async () => {
    const alice = await registerTestAccount('alice@example.test');

    const forgedToken = jwt.sign(
      { sub: alice.user.id, email: alice.user.email },
      'wrong-secret-key-at-least-32-chars!!',
      { algorithm: 'HS256' },
    );

    const unsignedAlgNoneToken = `${Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' }),
    ).toString('base64url')}.${Buffer.from(
      JSON.stringify({ sub: alice.user.id, email: alice.user.email }),
    ).toString('base64url')}.`;

    const expiredToken = jwt.sign(
      { sub: alice.user.id, email: alice.user.email },
      env.jwtSecret,
      { algorithm: 'HS256', expiresIn: -10 },
    );

    for (const badToken of [forgedToken, unsignedAlgNoneToken, expiredToken]) {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${badToken}`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }

    // Delete user in DB -> previously valid JWT is immediately rejected
    await UserModel.findByIdAndDelete(alice.user.id);
    const deletedAccountRes = await request(app)
      .get('/api/tasks')
      .set('Authorization', alice.authHeader);
    expect(deletedAccountRes.status).toBe(401);
  });

  it('enforces brute-force rate limiting with 429 TOO_MANY_REQUESTS and Retry-After header', async () => {
    const miniApp = express();
    miniApp.post(
      '/limited',
      createRateLimiter({
        windowMs: 60_000,
        maxAttempts: 2,
        enforceInTest: true,
      }),
      (_req, res) => {
        res.status(200).json({ ok: true });
      },
    );
    miniApp.use(errorMiddleware);

    const first = await request(miniApp).post('/limited');
    const second = await request(miniApp).post('/limited');
    const third = await request(miniApp).post('/limited');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(Number(third.headers['retry-after'])).toBeGreaterThanOrEqual(1);
  });
});

