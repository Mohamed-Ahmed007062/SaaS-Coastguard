import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, closeDb } from '../src/db/database.js';
import { TenantRepository } from '../src/repositories/tenant.repository.js';
import { TelemetryRepository } from '../src/repositories/telemetry.repository.js';

describe('Concept 7 - LLM Integration & AI Cost Advisor with Cost Logging', () => {
  const app = createApp();
  let testTenantId: string;

  beforeAll(async () => {
    getDb();
    const id = Date.now();
    const tenant = TenantRepository.create(`Advisor Test Org ${id}`, `advisor-org-${id}`, 1000.0);
    testTenantId = tenant.id;

    // Seed expensive requests to give advisor realistic data to analyze
    await request(app)
      .post('/api/v1/telemetry')
      .send({
        tenant_id: testTenantId,
        provider: 'openai',
        model: 'gpt-4o',
        prompt_tokens: 15_000,
        completion_tokens: 3_000,
      });

    await request(app)
      .post('/api/v1/telemetry')
      .send({
        tenant_id: testTenantId,
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        prompt_tokens: 22_000,
        completion_tokens: 4_500,
      });
  });

  afterAll(() => {
    closeDb();
  });

  it('1. AI Job: POST /api/v1/advisor/optimize generates structured optimization advice', async () => {
    const res = await request(app)
      .post('/api/v1/advisor/optimize')
      .send({ tenant_id: testTenantId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const advice = res.body.data;
    expect(advice.tenant_id).toBe(testTenantId);
    expect(advice.primary_cost_driver).toBeDefined();
    expect(advice.estimated_monthly_savings_usd).toBeGreaterThanOrEqual(0);
    expect(advice.recommended_model_substitutions.length).toBeGreaterThan(0);
    expect(advice.prompt_compression_tips.length).toBeGreaterThan(0);
    expect(advice.caching_candidates.length).toBeGreaterThan(0);
    expect(advice.advisory_token_usage).toBeDefined();
    expect(advice.advisory_token_usage.total_tokens).toBeGreaterThan(0);
  });

  it('2. Cost Log Verification: AI execution logged to usage_records database table', async () => {
    const records = TelemetryRepository.findByTenant(testTenantId, 10);
    const advisoryLog = records.find((r) => r.endpoint === '/api/v1/advisor/optimize');

    expect(advisoryLog).toBeDefined();
    expect(advisoryLog!.model).toBe('gemini-1.5-flash');
    expect(advisoryLog!.cost_usd).toBeGreaterThan(0);
    expect(advisoryLog!.prompt_tokens).toBe(420);
    expect(advisoryLog!.completion_tokens).toBe(260);
  });
});
