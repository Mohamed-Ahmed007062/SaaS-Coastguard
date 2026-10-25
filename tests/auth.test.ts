import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, closeDb } from '../src/db/database.js';

describe('Concept 3 - Authentication & API Key Management', () => {
  const app = createApp();
  const testId = Date.now();
  const testEmail = `founder_${testId}@acme.ai`;
  const testSlug = `acme-ai-${testId}`;
  let userToken: string;
  let tenantId: string;
  let rawApiKey: string;
  let apiKeyId: string;

  beforeAll(() => {
    getDb();
  });

  afterAll(() => {
    closeDb();
  });

  it('1. Register: Creates organization tenant, hashes password, and returns JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        tenant_name: 'Acme AI Labs',
        tenant_slug: testSlug,
        email: testEmail,
        password: 'SuperSecretPassword123!',
        monthly_budget_usd: 150.0,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.tenant.slug).toBe(testSlug);

    userToken = res.body.data.token;
    tenantId = res.body.data.tenant.id;
  });

  it('2. Login: Authenticates credentials and returns valid JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'SuperSecretPassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.tenant.id).toBe(tenantId);
  });

  it('3. Security: Rejects invalid password with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'founder@acme.ai',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('4. Protected Route: /api/v1/auth/me rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('5. Protected Route: /api/v1/auth/me accepts Bearer token and returns user profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.tenant.id).toBe(tenantId);
  });

  it('6. API Key Generation: Generates raw key starting with cg_live_ and stores hash', async () => {
    const res = await request(app)
      .post('/api/v1/auth/api-keys')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Backend Microservice Key',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.api_key).toMatch(/^cg_live_[a-f0-9]{48}$/);

    rawApiKey = res.body.data.api_key;
    apiKeyId = res.body.data.id;
  });

  it('7. Ingestion via API Key: Successfully ingests telemetry using x-api-key header', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry')
      .set('x-api-key', rawApiKey)
      .send({
        provider: 'openai',
        model: 'gpt-4o-mini',
        prompt_tokens: 800,
        completion_tokens: 200,
        endpoint: '/v1/chat/completions',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tenant_id).toBe(tenantId);
    expect(res.body.data.cost_usd).toBeGreaterThan(0);
  });

  it('8. Ingestion via Invalid Key: Rejects bad API key with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry')
      .set('x-api-key', 'cg_live_invalidkey12345678901234567890')
      .send({
        provider: 'openai',
        model: 'gpt-4o',
        prompt_tokens: 100,
        completion_tokens: 50,
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('9. Revocation: Revokes API key and verifies subsequent usage is blocked', async () => {
    const revokeRes = await request(app)
      .delete(`/api/v1/auth/api-keys/${apiKeyId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(revokeRes.status).toBe(200);

    const useRes = await request(app)
      .post('/api/v1/telemetry')
      .set('x-api-key', rawApiKey)
      .send({
        provider: 'openai',
        model: 'gpt-4o',
        prompt_tokens: 100,
        completion_tokens: 50,
      });

    expect(useRes.status).toBe(401);
  });
});
