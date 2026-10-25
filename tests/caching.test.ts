import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, closeDb } from '../src/db/database.js';
import { TenantRepository } from '../src/repositories/tenant.repository.js';
import { CacheService } from '../src/services/cache.service.js';

describe('Concept 6 - In-Memory Caching & Performance Optimization', () => {
  const app = createApp();
  let testTenantId: string;

  beforeAll(() => {
    getDb();
    CacheService.clear();
    const id = Date.now();
    const tenant = TenantRepository.create(`Cache Test Org ${id}`, `cache-test-org-${id}`, 200.0);
    testTenantId = tenant.id;
  });

  afterAll(() => {
    closeDb();
  });

  it('1. Cache MISS on initial computation', async () => {
    // Add baseline telemetry
    await request(app)
      .post('/api/v1/telemetry')
      .send({
        tenant_id: testTenantId,
        provider: 'openai',
        model: 'gpt-4o',
        prompt_tokens: 1000,
        completion_tokens: 400,
      });

    const res = await request(app)
      .get(`/api/v1/analytics/summary?tenant_id=${testTenantId}`);

    expect(res.status).toBe(200);
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.body.data.from_cache).toBe(false);
    expect(res.body.data.total_tokens).toBe(1400);
  });

  it('2. Cache HIT on immediate repeated query', async () => {
    const res = await request(app)
      .get(`/api/v1/analytics/summary?tenant_id=${testTenantId}`);

    expect(res.status).toBe(200);
    expect(res.headers['x-cache']).toBe('HIT');
    expect(res.body.data.from_cache).toBe(true);
    expect(res.body.data.total_tokens).toBe(1400);
  });

  it('3. Cache Invalidation: Ingesting new telemetry invalidates cached metrics', async () => {
    // Ingest second usage event
    await request(app)
      .post('/api/v1/telemetry')
      .send({
        tenant_id: testTenantId,
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        prompt_tokens: 2000,
        completion_tokens: 600,
      });

    // Query again - should be a cache MISS with fresh recalculated totals
    const res = await request(app)
      .get(`/api/v1/analytics/summary?tenant_id=${testTenantId}`);

    expect(res.status).toBe(200);
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.body.data.from_cache).toBe(false);
    expect(res.body.data.total_tokens).toBe(4000); // 1400 + 2600
    expect(res.body.data.models.length).toBe(2);
  });

  it('4. Cache Stats: Accurately reports hits, misses, and hit rate', async () => {
    const res = await request(app).get('/api/v1/analytics/cache-stats');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hits).toBeGreaterThanOrEqual(1);
    expect(res.body.data.misses).toBeGreaterThanOrEqual(1);
    expect(res.body.data.hitRate).toBeGreaterThan(0);
  });

  it('5. Manual Bypass: Allows no_cache=true to bypass in-memory cache directly', async () => {
    const res = await request(app)
      .get(`/api/v1/analytics/summary?tenant_id=${testTenantId}&no_cache=true`);

    expect(res.status).toBe(200);
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.body.data.from_cache).toBe(false);
  });
});
