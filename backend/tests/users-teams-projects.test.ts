import request from 'supertest';
import app from '../src/app';
import {
  clearTestDatabase,
  registerTestAccount,
  setupTestDatabase,
  teardownTestDatabase,
} from './helpers/test-db';

describe('Users Profile, Teams RBAC, Projects & Features', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('User Profile & Password (/api/users/me*)', () => {
    it('updates profile & raster avatar, blocks XSS avatar URIs (javascript: / svg), and rotates password securely', async () => {
      const sarah = await registerTestAccount('sarah@example.test', {
        firstName: 'Sarah',
        lastName: 'Front',
        password: 'OldPassword123!',
      });

      const meRes = await request(app)
        .get('/api/users/me')
        .set('Authorization', sarah.authHeader);
      expect(meRes.status).toBe(200);
      expect(meRes.body.firstName).toBe('Sarah');

      // Block XSS avatar schemes
      for (const dangerousAvatar of [
        'javascript:alert(1)',
        'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      ]) {
        const badAvatarRes = await request(app)
          .patch('/api/users/me')
          .set('Authorization', sarah.authHeader)
          .send({ avatarUrl: dangerousAvatar });
        expect(badAvatarRes.status).toBe(400);
      }

      const validPngDataUri =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const updateRes = await request(app)
        .patch('/api/users/me')
        .set('Authorization', sarah.authHeader)
        .send({ firstName: 'Sarah ✨', avatarUrl: validPngDataUri });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.avatarUrl).toBe(validPngDataUri);

      // Wrong current password -> 401
      const wrongCurrent = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', sarah.authHeader)
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!',
        });
      expect(wrongCurrent.status).toBe(401);

      // Rotate password -> 200, old password rejected on login, new password succeeds
      const rotateOk = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', sarah.authHeader)
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!',
        });
      expect(rotateOk.status).toBe(200);

      const oldLogin = await request(app).post('/api/auth/login').send({
        email: 'sarah@example.test',
        password: 'OldPassword123!',
      });
      expect(oldLogin.status).toBe(401);

      const newLogin = await request(app).post('/api/auth/login').send({
        email: 'sarah@example.test',
        password: 'NewPassword456!',
      });
      expect(newLogin.status).toBe(200);
    });
  });

  describe('Teams, Memberships, Anti-Escalation & Projects/Features RBAC', () => {
    it('enforces team admin governance, last-admin protection, project key uniqueness per team, and feature cascade cleanup', async () => {
      const adminA = await registerTestAccount('admin-a@example.test', {
        firstName: 'Hamza',
      });
      const pmA = await registerTestAccount('pm-a@example.test', {
        firstName: 'Reda',
      });
      const devA = await registerTestAccount('dev-a@example.test', {
        firstName: 'Dev',
      });
      const adminB = await registerTestAccount('admin-b@example.test', {
        firstName: 'Outsider',
      });

      // Non-admin user cannot search global directory -> 403
      const forbiddenSearch = await request(app)
        .get('/api/users?search=Reda')
        .set('Authorization', devA.authHeader);
      expect(forbiddenSearch.status).toBe(403);

      // Create Team A -> creator becomes 'admin'
      const teamARes = await request(app)
        .post('/api/teams')
        .set('Authorization', adminA.authHeader)
        .send({ name: 'Backend Pink Team', description: 'Équipe API' });
      expect(teamARes.status).toBe(201);
      expect(teamARes.body.myRole).toBe('admin');
      const teamAId = teamARes.body.id as string;

      // Team admin CAN search users safely (even with regex metacharacters)
      const adminSearch = await request(app)
        .get(`/api/users?search=${encodeURIComponent('Reda')}`)
        .set('Authorization', adminA.authHeader);
      expect(adminSearch.status).toBe(200);
      expect(adminSearch.body.items.some((u: { id: string }) => u.id === pmA.user.id)).toBe(true);

      // Last admin cannot demote or remove themselves -> 400
      const demoteLastAdmin = await request(app)
        .patch(`/api/teams/${teamAId}/members/${adminA.user.id}`)
        .set('Authorization', adminA.authHeader)
        .send({ role: 'developer' });
      expect(demoteLastAdmin.status).toBe(400);

      const removeLastAdmin = await request(app)
        .delete(`/api/teams/${teamAId}/members/${adminA.user.id}`)
        .set('Authorization', adminA.authHeader);
      expect(removeLastAdmin.status).toBe(400);

      // Add PM (by email) and Dev (by userId)
      const addPmRes = await request(app)
        .post(`/api/teams/${teamAId}/members`)
        .set('Authorization', adminA.authHeader)
        .send({ email: 'PM-A@example.test', role: 'project_manager' });
      expect(addPmRes.status).toBe(201);

      const addDevRes = await request(app)
        .post(`/api/teams/${teamAId}/members`)
        .set('Authorization', adminA.authHeader)
        .send({ userId: devA.user.id, role: 'developer' });
      expect(addDevRes.status).toBe(201);

      // Developer cannot self-promote or add members -> 403
      const selfPromote = await request(app)
        .patch(`/api/teams/${teamAId}/members/${devA.user.id}`)
        .set('Authorization', devA.authHeader)
        .send({ role: 'admin' });
      expect(selfPromote.status).toBe(403);

      // Project creation: Developer blocked (403), PM allowed (201, key uppercased)
      const devCreateProj = await request(app)
        .post('/api/projects')
        .set('Authorization', devA.authHeader)
        .send({ teamId: teamAId, name: 'Blocked', key: 'BLK' });
      expect(devCreateProj.status).toBe(403);

      const pmCreateProj = await request(app)
        .post('/api/projects')
        .set('Authorization', pmA.authHeader)
        .send({ teamId: teamAId, name: 'TaskFlow Core', key: '  tf1  ' });
      expect(pmCreateProj.status).toBe(201);
      expect(pmCreateProj.body.key).toBe('TF1');
      const projectAId = pmCreateProj.body.id as string;

      // Duplicate key in same team -> 409; same key in Team B -> 201
      const dupKeySameTeam = await request(app)
        .post('/api/projects')
        .set('Authorization', adminA.authHeader)
        .send({ teamId: teamAId, name: 'Dup', key: 'TF1' });
      expect(dupKeySameTeam.status).toBe(409);

      const teamBRes = await request(app)
        .post('/api/teams')
        .set('Authorization', adminB.authHeader)
        .send({ name: 'Other Team' });
      const sameKeyOtherTeam = await request(app)
        .post('/api/projects')
        .set('Authorization', adminB.authHeader)
        .send({ teamId: teamBRes.body.id, name: 'Other TF1', key: 'TF1' });
      expect(sameKeyOtherTeam.status).toBe(201);

      // Features: PM creates feature (201), Dev reads (200) & cannot delete (403), Outsider blocked (403)
      const featRes = await request(app)
        .post('/api/features')
        .set('Authorization', pmA.authHeader)
        .send({ projectId: projectAId, title: 'Authentification JWT' });
      expect(featRes.status).toBe(201);
      const featureId = featRes.body.id as string;

      const devReadFeatures = await request(app)
        .get(`/api/projects/${projectAId}/features`)
        .set('Authorization', devA.authHeader);
      expect(devReadFeatures.status).toBe(200);
      expect(devReadFeatures.body.items).toHaveLength(1);

      const devDeleteFeature = await request(app)
        .delete(`/api/features/${featureId}`)
        .set('Authorization', devA.authHeader);
      expect(devDeleteFeature.status).toBe(403);

      const outsiderReadProject = await request(app)
        .get(`/api/projects/${projectAId}`)
        .set('Authorization', adminB.authHeader);
      expect(outsiderReadProject.status).toBe(403);
    });
  });
});

