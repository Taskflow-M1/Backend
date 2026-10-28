import request from 'supertest';
import app from '../src/app';
import {
  clearTestDatabase,
  registerTestAccount,
  setupTestDatabase,
  teardownTestDatabase,
} from './helpers/test-db';

describe('Collaborative Tickets, Kanban Workflow, Comments, Audit History & Dashboard', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('executes the end-to-end collaborative Jira workflow with RBAC, Kanban filters, comments, audit history, and dashboard metrics', async () => {
    const adminA = await registerTestAccount('admin-a@example.test', {
      firstName: 'Admin',
      lastName: 'Alpha',
    });
    const pmA = await registerTestAccount('pm-a@example.test', {
      firstName: 'Chef',
      lastName: 'Projet',
    });
    const devA = await registerTestAccount('dev-a@example.test', {
      firstName: 'Dev',
      lastName: 'Rose',
    });
    const testerA = await registerTestAccount('tester-a@example.test', {
      firstName: 'QA',
      lastName: 'Tester',
    });
    const outsiderB = await registerTestAccount('outsider-b@example.test', {
      firstName: 'Outsider',
      lastName: 'Beta',
    });

    // 1. Setup Team, Roles, Project & Feature
    const teamRes = await request(app)
      .post('/api/teams')
      .set('Authorization', adminA.authHeader)
      .send({ name: 'Squad TaskFlow' });
    const teamId = teamRes.body.id as string;

    for (const [account, role] of [
      [pmA, 'project_manager'],
      [devA, 'developer'],
      [testerA, 'tester'],
    ] as const) {
      await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set('Authorization', adminA.authHeader)
        .send({ userId: account.user.id, role });
    }

    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', pmA.authHeader)
      .send({ teamId, name: 'TaskFlow App', key: 'TFA' });
    const projectId = projectRes.body.id as string;

    const featureRes = await request(app)
      .post('/api/features')
      .set('Authorization', pmA.authHeader)
      .send({ projectId, title: 'Tableau Kanban' });
    const featureId = featureRes.body.id as string;

    // 2. Reject assigning outside the team (400)
    const badAssignRes = await request(app)
      .post('/api/tickets')
      .set('Authorization', pmA.authHeader)
      .send({
        projectId,
        title: 'Invalid Assignee',
        assignedTo: outsiderB.user.id,
      });
    expect(badAssignRes.status).toBe(400);

    // 3. Create 2 tickets (TFA-1 overdue assigned to Dev, TFA-2 unassigned)
    const t1Res = await request(app)
      .post('/api/tickets')
      .set('Authorization', pmA.authHeader)
      .send({
        projectId,
        featureId,
        title: 'Implémenter colonnes Kanban',
        priority: 'high',
        type: 'story',
        dueDate: '2020-06-01',
        assignedTo: devA.user.id,
      });
    expect(t1Res.status).toBe(201);
    expect(t1Res.body.key).toBe('TFA-1');
    const t1Id = t1Res.body.id as string;

    const t2Res = await request(app)
      .post('/api/tickets')
      .set('Authorization', testerA.authHeader)
      .send({
        projectId,
        featureId,
        title: 'Corriger responsive mobile',
        priority: 'critical',
        type: 'bug',
      });
    expect(t2Res.status).toBe(201);
    expect(t2Res.body.key).toBe('TFA-2');
    const t2Id = t2Res.body.id as string;

    // 4. Developer self-claims unassigned TFA-2, moves TFA-1 todo -> doing -> testing, blocked from 'done'
    const selfClaim = await request(app)
      .patch(`/api/tickets/${t2Id}/assign`)
      .set('Authorization', devA.authHeader)
      .send({ assignedTo: devA.user.id });
    expect(selfClaim.status).toBe(200);

    await request(app)
      .patch(`/api/tickets/${t1Id}/status`)
      .set('Authorization', devA.authHeader)
      .send({ status: 'doing' });
    await request(app)
      .patch(`/api/tickets/${t1Id}/status`)
      .set('Authorization', devA.authHeader)
      .send({ status: 'testing' });

    const devTryDone = await request(app)
      .patch(`/api/tickets/${t1Id}/status`)
      .set('Authorization', devA.authHeader)
      .send({ status: 'done' });
    expect(devTryDone.status).toBe(403);

    // 5. Tester rejects TFA-1 with inline comment, Dev resubmits, Tester validates to 'done'
    const testerReject = await request(app)
      .patch(`/api/tickets/${t1Id}/status`)
      .set('Authorization', testerA.authHeader)
      .send({ status: 'doing', comment: 'Manque le compteur par colonne' });
    expect(testerReject.status).toBe(200);

    await request(app)
      .patch(`/api/tickets/${t1Id}/status`)
      .set('Authorization', devA.authHeader)
      .send({ status: 'testing' });

    const testerValidate = await request(app)
      .patch(`/api/tickets/${t1Id}/status`)
      .set('Authorization', testerA.authHeader)
      .send({ status: 'done' });
    expect(testerValidate.status).toBe(200);

    // 6. Feature progress is now 1/2 = 50%
    const featureAfter = await request(app)
      .get(`/api/features/${featureId}`)
      .set('Authorization', devA.authHeader);
    expect(featureAfter.body.ticketCount).toBe(2);
    expect(featureAfter.body.doneTicketCount).toBe(1);
    expect(featureAfter.body.progressPercent).toBe(50);

    // 7. Kanban board & search
    const kanbanRes = await request(app)
      .get(`/api/projects/${projectId}/kanban`)
      .set('Authorization', devA.authHeader);
    expect(kanbanRes.status).toBe(200);
    expect(kanbanRes.body.counts).toEqual({
      todo: 1,
      doing: 0,
      testing: 0,
      done: 1,
    });

    const paginatedSearch = await request(app)
      .get(`/api/tickets?projectId=${projectId}&search=tfa-2&page=1&limit=10`)
      .set('Authorization', devA.authHeader);
    expect(paginatedSearch.status).toBe(200);
    expect(paginatedSearch.body.items).toHaveLength(1);
    expect(paginatedSearch.body.items[0].id).toBe(t2Id);

    // 8. Comments author-only edit & audit history verification
    const commentsRes = await request(app)
      .get(`/api/tickets/${t1Id}/comments`)
      .set('Authorization', devA.authHeader);
    expect(commentsRes.body.items).toHaveLength(1);
    const commentId = commentsRes.body.items[0].id as string;

    const devEditTesterComment = await request(app)
      .patch(`/api/comments/${commentId}`)
      .set('Authorization', devA.authHeader)
      .send({ content: 'Tentative modification' });
    expect(devEditTesterComment.status).toBe(403);

    const testerEditOwnComment = await request(app)
      .patch(`/api/comments/${commentId}`)
      .set('Authorization', testerA.authHeader)
      .send({ content: 'Compteur vérifié OK' });
    expect(testerEditOwnComment.status).toBe(200);
    expect(testerEditOwnComment.body.isEdited).toBe(true);

    const historyRes = await request(app)
      .get(`/api/tickets/${t1Id}/history`)
      .set('Authorization', devA.authHeader);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.items.length).toBeGreaterThanOrEqual(6);
    expect(historyRes.body.items[0].action).toBe('ticket_created');

    // 9. Dashboard KPIs & cross-team isolation
    const pmDashboard = await request(app)
      .get('/api/dashboard')
      .set('Authorization', pmA.authHeader);
    expect(pmDashboard.status).toBe(200);
    expect(pmDashboard.body.summary.accessibleProjectsCount).toBe(1);
    expect(pmDashboard.body.summary.totalTicketsCount).toBe(2);
    expect(pmDashboard.body.summary.completionRatePercent).toBe(50);

    const outsiderDashboard = await request(app)
      .get('/api/dashboard')
      .set('Authorization', outsiderB.authHeader);
    expect(outsiderDashboard.status).toBe(200);
    expect(outsiderDashboard.body.summary.accessibleProjectsCount).toBe(0);
    expect(outsiderDashboard.body.recentActivity).toEqual([]);
  });
});

