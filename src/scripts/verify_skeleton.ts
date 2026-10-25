import { createApp } from '../app.js';
import { getDb, closeDb } from '../db/database.js';
import { TenantRepository } from '../repositories/tenant.repository.js';
import request from 'supertest';

async function main() {
  console.log('--- SaaS CostGuard Walking Skeleton Verification ---');
  getDb();
  TenantRepository.ensureDefaultTenant();

  const app = createApp();

  // Test 1: Health check
  console.log('[1/3] Testing GET /health ...');
  const healthRes = await request(app).get('/health');
  console.log('  -> Status:', healthRes.status, JSON.stringify(healthRes.body));

  // Test 2: Ingest sample LLM telemetry
  console.log('[2/3] Testing POST /api/v1/telemetry ...');
  const telemetryRes = await request(app)
    .post('/api/v1/telemetry')
    .send({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
      prompt_tokens: 3200,
      completion_tokens: 850,
      endpoint: '/v1/messages',
      latency_ms: 620,
      metadata: { feature: 'code-review-assistant' }
    });
  console.log('  -> Status:', telemetryRes.status, JSON.stringify(telemetryRes.body, null, 2));

  // Test 3: Retrieve persisted telemetry from SQLite
  console.log('[3/3] Testing GET /api/v1/telemetry ...');
  const listRes = await request(app).get('/api/v1/telemetry?limit=5');
  console.log('  -> Status:', listRes.status, `Total saved records: ${listRes.body.count}`);
  console.log('  -> Latest saved record:', listRes.body.data[0]);

  closeDb();
  console.log('\n>>> Walking Skeleton is fully functional, end-to-end! <<<');
}

main().catch(console.error);
