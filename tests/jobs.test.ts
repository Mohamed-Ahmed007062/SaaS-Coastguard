import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, closeDb } from '../src/db/database.js';
import { TenantRepository } from '../src/repositories/tenant.repository.js';
import { BackgroundQueue } from '../src/jobs/worker.js';

describe('Concept 4 - Background Jobs & Anomaly Detection Sweeps', () => {
  const app = createApp();
  let testTenantId: string;

  beforeAll(() => {
    getDb();
    const id = Date.now();
    const tenant = TenantRepository.create(`Jobs Test Org ${id}`, `jobs-org-${id}`, 10.0);
    testTenantId = tenant.id;
  });

  afterAll(() => {
    closeDb();
  });

  it('1. Spike Ingestion: Ingests an expensive query that triggers spike threshold', async () => {
    // gpt-4-turbo: 60k prompt tokens = $0.60 (exceeds $0.50 threshold)
    const res = await request(app)
      .post('/api/v1/telemetry')
      .send({
        tenant_id: testTenantId,
        provider: 'openai',
        model: 'gpt-4-turbo',
        prompt_tokens: 60_000,
        completion_tokens: 1_000,
        endpoint: '/v1/chat/completions',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.cost_usd).toBeGreaterThanOrEqual(0.60);
  });

  it('2. Runaway Loop Simulation: Ingests 10 rapid identical requests', async () => {
    for (let i = 0; i < 11; i++) {
      await request(app)
        .post('/api/v1/telemetry')
        .send({
          tenant_id: testTenantId,
          provider: 'openai',
          model: 'gpt-4o-mini',
          prompt_tokens: 50,
          completion_tokens: 50,
          endpoint: '/v1/loop-endpoint',
        });
    }
  });

  it('3. Background Job Enqueue: POST /api/v1/jobs/anomaly-sweep enqueues async worker job', async () => {
    const res = await request(app)
      .post('/api/v1/jobs/anomaly-sweep')
      .send({ tenant_id: testTenantId });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.job_id).toBeDefined();

    const jobId = res.body.job_id;

    // Allow async event loop to process background worker queue
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Verify job completion
    const jobRes = await request(app).get(`/api/v1/jobs/${jobId}`);
    expect(jobRes.status).toBe(200);
    expect(jobRes.body.data.status).toBe('COMPLETED');
    expect(jobRes.body.data.result.detected_anomalies_count).toBeGreaterThanOrEqual(1);
  });

  it('4. Anomaly Inspection: GET /api/v1/anomalies returns detected incidents', async () => {
    const res = await request(app).get(`/api/v1/anomalies?tenant_id=${testTenantId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(1);

    const types = res.body.data.map((a: any) => a.anomaly_type);
    expect(types).toContain('SPIKE_COST');
  });
});
