import request from 'supertest';
import app from '../src/app';

describe('OpenAPI 3.0 & Swagger UI Documentation (/api/docs)', () => {
  it('serves the raw OpenAPI 3.0.3 JSON specification on GET /api/docs.json with BearerAuth and all routes', async () => {
    const res = await request(app).get('/api/docs.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('TaskFlow API');
    expect(res.body.components.securitySchemes.BearerAuth).toEqual(
      expect.objectContaining({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      }),
    );

    const expectedPaths = [
      '/api/health',
      '/api/auth/register',
      '/api/auth/login',
      '/api/tasks',
      '/api/tasks/{id}',
      '/api/users',
      '/api/users/me',
      '/api/users/me/password',
      '/api/teams',
      '/api/teams/{id}',
      '/api/teams/{id}/members',
      '/api/teams/{id}/members/{userId}',
      '/api/teams/{id}/activity',
      '/api/projects',
      '/api/projects/{id}',
      '/api/projects/{id}/features',
      '/api/projects/{id}/tickets',
      '/api/projects/{id}/kanban',
      '/api/features',
      '/api/features/{id}',
      '/api/tickets',
      '/api/tickets/assigned/me',
      '/api/tickets/{id}',
      '/api/tickets/{id}/status',
      '/api/tickets/{id}/assign',
      '/api/tickets/{id}/comments',
      '/api/tickets/{id}/history',
      '/api/comments/{id}',
      '/api/dashboard',
    ];

    for (const apiPath of expectedPaths) {
      expect(res.body.paths).toHaveProperty(apiPath);
    }
  });

  it('serves the interactive Swagger UI HTML and initializer script on GET /api/docs/', async () => {
    const htmlRes = await request(app).get('/api/docs/');
    expect(htmlRes.status).toBe(200);
    expect(htmlRes.headers['content-type']).toContain('text/html');
    expect(htmlRes.text).toContain('TaskFlow API — Documentation Swagger');
    expect(htmlRes.text).toContain('./swagger-ui-bundle.js');

    const initScriptRes = await request(app).get('/api/docs/swagger-ui-init.js');
    expect(initScriptRes.status).toBe(200);
    expect(initScriptRes.headers['content-type']).toContain('javascript');
    expect(initScriptRes.text).toContain('TaskFlow API');
  });
});

