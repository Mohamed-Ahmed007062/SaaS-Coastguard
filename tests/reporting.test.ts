import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, closeDb } from '../src/db/database.js';
import { TenantRepository } from '../src/repositories/tenant.repository.js';

describe('Concept 5 - PDF Financial Spend Reporting', () => {
  const app = createApp();
  let testTenantId: string;

  beforeAll(async () => {
    getDb();
    const id = Date.now();
    const tenant = TenantRepository.create(`Report Test Org ${id}`, `report-org-${id}`, 500.0);
    testTenantId = tenant.id;

    // Seed sample telemetry
    await request(app)
      .post('/api/v1/telemetry')
      .send({
        tenant_id: testTenantId,
        provider: 'openai',
        model: 'gpt-4o',
        prompt_tokens: 2500,
        completion_tokens: 750,
      });

    await request(app)
      .post('/api/v1/telemetry')
      .send({
        tenant_id: testTenantId,
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        prompt_tokens: 4200,
        completion_tokens: 950,
      });
  });

  afterAll(() => {
    closeDb();
  });

  it('1. PDF Generation: GET /api/v1/reports/pdf generates and streams valid PDF document', async () => {
    const res = await request(app)
      .get(`/api/v1/reports/pdf?tenant_id=${testTenantId}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('.pdf');

    const pdfBuffer: Buffer = res.body;
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(1500);

    // Verify PDF header magic bytes "%PDF-"
    const magicBytes = pdfBuffer.subarray(0, 5).toString('ascii');
    expect(magicBytes).toBe('%PDF-');
  });

  it('2. Report Preview: GET /api/v1/reports/preview returns JSON data feed for PDF', async () => {
    const res = await request(app).get(`/api/v1/reports/preview?tenant_id=${testTenantId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.models.length).toBe(2);
    expect(res.body.data.anomalies).toBeDefined();
  });
});
