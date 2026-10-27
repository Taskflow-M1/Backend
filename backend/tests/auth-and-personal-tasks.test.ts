import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import {
  clearTestDatabase,
  registerTestAccount,
  setupTestDatabase,
  teardownTestDatabase,
} from './helpers/test-db';

describe('Health, Authentication & Personal Tasks Isolation', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/health', () => {
    it('returns 200 and exact {"status":"ok"} publicly', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/auth/register & POST /api/auth/login', () => {
    it('registers a user (201), normalizes email case-insensitively, and never exposes password hashes', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: '  Alice@Example.TEST  ',
        password: 'MotDePasse123!',
      });

      expect(res.status).toBe(201);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.split('.')).toHaveLength(3);
      expect(typeof res.body.user.id).toBe('string');
      expect(res.body.user.email).toBe('alice@example.test');
      expect(res.body.user._id).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('rejects duplicate email case-insensitively with 409 EMAIL_ALREADY_USED', async () => {
      await registerTestAccount('alice@example.test');

      const duplicateRes = await request(app).post('/api/auth/register').send({
        email: 'ALICE@EXAMPLE.TEST',
        password: 'AnotherPassword123!',
      });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.error.code).toBe('EMAIL_ALREADY_USED');
    });

    it('rejects invalid registration payloads with 400 INVALID_INPUT', async () => {
      for (const invalidBody of [
        { email: 'not-an-email', password: 'MotDePasse123!' },
        { email: 'bob@example.test', password: 'short' },
        { email: 'bob@example.test', password: 'MotDePasse123!', role: 'admin' },
      ]) {
        const res = await request(app)
          .post('/api/auth/register')
          .send(invalidBody);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('INVALID_INPUT');
      }
    });

    it('logs in with valid credentials (200) and rejects wrong password or unknown email identically (401 UNAUTHORIZED)', async () => {
      await registerTestAccount('alice@example.test', {
        password: 'MotDePasse123!',
      });

      const loginOk = await request(app).post('/api/auth/login').send({
        email: 'ALICE@example.test',
        password: 'MotDePasse123!',
      });
      expect(loginOk.status).toBe(200);
      expect(typeof loginOk.body.token).toBe('string');
      expect(loginOk.body.user.passwordHash).toBeUndefined();

      const wrongPass = await request(app).post('/api/auth/login').send({
        email: 'alice@example.test',
        password: 'WrongPassword123!',
      });
      const unknownEmail = await request(app).post('/api/auth/login').send({
        email: 'nobody@example.test',
        password: 'MotDePasse123!',
      });

      expect(wrongPass.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPass.body).toEqual(unknownEmail.body);
      expect(wrongPass.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('/api/tasks CRUD, server-side validations & User A / User B isolation', () => {
    it('rejects unauthenticated access to all /api/tasks routes with 401 UNAUTHORIZED', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const responses = await Promise.all([
        request(app).get('/api/tasks'),
        request(app).post('/api/tasks').send({ title: 'T', status: 'todo' }),
        request(app).get(`/api/tasks/${fakeId}`),
        request(app).patch(`/api/tasks/${fakeId}`).send({ status: 'done' }),
        request(app).delete(`/api/tasks/${fakeId}`),
      ]);

      for (const res of responses) {
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('performs a complete nominal CRUD lifecycle on /api/tasks', async () => {
      const alice = await registerTestAccount('alice@example.test');

      // 1. Empty collection -> 200 {"items":[]}
      const emptyList = await request(app)
        .get('/api/tasks')
        .set('Authorization', alice.authHeader);
      expect(emptyList.status).toBe(200);
      expect(emptyList.body).toEqual({ items: [] });

      // 2. Create task -> 201
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', alice.authHeader)
        .send({
          title: '  Préparer la démo  ',
          status: 'todo',
          description: 'Plan et données',
          dueDate: '2026-10-05',
        });

      expect(createRes.status).toBe(201);
      expect(typeof createRes.body.id).toBe('string');
      expect(createRes.body._id).toBeUndefined();
      expect(createRes.body.ownerId).toBeUndefined();
      expect(createRes.body.title).toBe('Préparer la démo');
      expect(createRes.body.status).toBe('todo');
      expect(createRes.body.dueDate).toBe('2026-10-05');

      const taskId = createRes.body.id as string;

      // 3. List & Get by ID -> 200
      const listRes = await request(app)
        .get('/api/tasks')
        .set('Authorization', alice.authHeader);
      expect(listRes.status).toBe(200);
      expect(listRes.body.items).toHaveLength(1);
      expect(listRes.body.items[0].id).toBe(taskId);

      const getRes = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', alice.authHeader);
      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(taskId);

      // 4. Partial PATCH -> 200
      const patchRes = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', alice.authHeader)
        .send({ status: 'done', dueDate: null });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.status).toBe('done');
      expect(patchRes.body.dueDate).toBeNull();

      // 5. DELETE -> 204 empty body, subsequent GET -> 404 NOT_FOUND
      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', alice.authHeader);
      expect(deleteRes.status).toBe(204);
      expect(deleteRes.text).toBe('');

      const getAfterDelete = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', alice.authHeader);
      expect(getAfterDelete.status).toBe(404);
      expect(getAfterDelete.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects invalid fields, impossible calendar dates, malformed ObjectIds, empty PATCH, and client-supplied ownerId/id with 400 INVALID_INPUT', async () => {
      const alice = await registerTestAccount('alice@example.test');
      const validTask = await request(app)
        .post('/api/tasks')
        .set('Authorization', alice.authHeader)
        .send({ title: 'Valide', status: 'todo' });
      const taskId = validTask.body.id as string;

      const invalidCreates = [
        { title: '   ', status: 'todo' },
        { title: 'A'.repeat(121), status: 'todo' },
        { title: 'Préparer', status: 'archived' },
        { title: 'Préparer', status: 'testing' },
        { title: 'Date impossible', status: 'todo', dueDate: '2026-02-30' },
        { title: 'Non bissextile', status: 'todo', dueDate: '2025-02-29' },
        { title: 'Inject owner', status: 'todo', ownerId: alice.user.id },
        { title: 'Inject id', status: 'todo', id: taskId },
      ];

      for (const body of invalidCreates) {
        const res = await request(app)
          .post('/api/tasks')
          .set('Authorization', alice.authHeader)
          .send(body);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('INVALID_INPUT');
      }

      const emptyPatch = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', alice.authHeader)
        .send({});
      expect(emptyPatch.status).toBe(400);
      expect(emptyPatch.body.error.code).toBe('INVALID_INPUT');

      const ownerPatch = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', alice.authHeader)
        .send({ ownerId: alice.user.id });
      expect(ownerPatch.status).toBe(400);

      const badIdRes = await request(app)
        .get('/api/tasks/not-a-valid-objectid')
        .set('Authorization', alice.authHeader);
      expect(badIdRes.status).toBe(400);
      expect(badIdRes.body.error.code).toBe('INVALID_INPUT');
    });

    it('strictly isolates User A and User B tasks (B sees empty list and gets 404 NOT_FOUND on GET/PATCH/DELETE of A task)', async () => {
      const userA = await registerTestAccount('user-a@example.test');
      const userB = await registerTestAccount('user-b@example.test');

      const createdByA = await request(app)
        .post('/api/tasks')
        .set('Authorization', userA.authHeader)
        .send({ title: 'Secret Task A', status: 'doing' });
      const taskAId = createdByA.body.id as string;

      // User B sees 0 tasks
      const listB = await request(app)
        .get('/api/tasks')
        .set('Authorization', userB.authHeader);
      expect(listB.status).toBe(200);
      expect(listB.body).toEqual({ items: [] });

      // User B gets 404 NOT_FOUND on GET, PATCH, DELETE of User A's existing task
      const getByB = await request(app)
        .get(`/api/tasks/${taskAId}`)
        .set('Authorization', userB.authHeader);
      const patchByB = await request(app)
        .patch(`/api/tasks/${taskAId}`)
        .set('Authorization', userB.authHeader)
        .send({ title: 'Hacked' });
      const deleteByB = await request(app)
        .delete(`/api/tasks/${taskAId}`)
        .set('Authorization', userB.authHeader);

      expect(getByB.status).toBe(404);
      expect(getByB.body.error.code).toBe('NOT_FOUND');
      expect(patchByB.status).toBe(404);
      expect(patchByB.body.error.code).toBe('NOT_FOUND');
      expect(deleteByB.status).toBe(404);
      expect(deleteByB.body.error.code).toBe('NOT_FOUND');

      // User A's task remains untouched
      const verifyA = await request(app)
        .get(`/api/tasks/${taskAId}`)
        .set('Authorization', userA.authHeader);
      expect(verifyA.status).toBe(200);
      expect(verifyA.body.title).toBe('Secret Task A');
    });
  });
});

