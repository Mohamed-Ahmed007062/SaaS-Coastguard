import { getDb, closeDb } from '../db/database.js';
import { TenantRepository } from '../repositories/tenant.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AuthService } from '../services/auth.service.js';
import { TelemetryRepository } from '../repositories/telemetry.repository.js';
import { AnomalyService } from '../services/anomaly.service.js';
import { calculateCost } from '../services/pricing.service.js';
import crypto from 'crypto';

async function seed() {
  console.log('=====================================================');
  console.log('   SaaS CostGuard — Database Seeding & Demo Setup    ');
  console.log('=====================================================\n');

  const db = getDb();

  // Clean existing tables for deterministic demo environment
  db.exec(`
    DELETE FROM anomalies;
    DELETE FROM usage_records;
    DELETE FROM api_keys;
    DELETE FROM users;
    DELETE FROM tenants;
  `);

  console.log('[1/5] Creating Tenants...');
  const acmeTenant = TenantRepository.create('Acme AI Platform', 'acme-corp', 250.0);
  const starlightTenant = TenantRepository.create('Starlight Apps', 'starlight-apps', 35.0);
  console.log(`  ✓ Tenant: ${acmeTenant.name} (Budget: $${acmeTenant.monthly_budget_usd})`);
  console.log(`  ✓ Tenant: ${starlightTenant.name} (Budget: $${starlightTenant.monthly_budget_usd})`);

  console.log('\n[2/5] Creating Admin Users...');
  const passwordHash = await AuthService.hashPassword('Password123!');
  const acmeAdmin = UserRepository.create(acmeTenant.id, 'admin@acme.com', passwordHash, 'admin');
  const starlightAdmin = UserRepository.create(starlightTenant.id, 'dev@starlight.io', passwordHash, 'admin');
  console.log(`  ✓ User: admin@acme.com / Password123!`);
  console.log(`  ✓ User: dev@starlight.io / Password123!`);

  console.log('\n[3/5] Generating API Keys...');
  const { key: acmeKey } = AuthService.generateApiKey(acmeTenant.id, 'Acme Primary Ingestion Key');
  const { key: starlightKey } = AuthService.generateApiKey(starlightTenant.id, 'Starlight Production Key');
  console.log(`  ✓ Acme API Key:      ${acmeKey}`);
  console.log(`  ✓ Starlight API Key: ${starlightKey}`);

  console.log('\n[4/5] Ingesting Realistic LLM Telemetry (35+ records)...');
  const models = [
    { provider: 'openai', model: 'gpt-4o', prompt: 1800, completion: 450, endpoint: '/v1/chat/completions' },
    { provider: 'openai', model: 'gpt-4o-mini', prompt: 600, completion: 150, endpoint: '/v1/chat/completions' },
    { provider: 'anthropic', model: 'claude-3-5-sonnet', prompt: 3500, completion: 800, endpoint: '/v1/messages' },
    { provider: 'google', model: 'gemini-1.5-flash', prompt: 1200, completion: 300, endpoint: '/v1beta/models' },
    { provider: 'groq', model: 'llama-3.3-70b', prompt: 2100, completion: 500, endpoint: '/openai/v1/chat/completions' },
  ];

  // Ingest regular usage
  for (let i = 0; i < 25; i++) {
    const item = models[i % models.length];
    const promptTokens = item.prompt + Math.floor(Math.random() * 400);
    const compTokens = item.completion + Math.floor(Math.random() * 100);
    const totalTokens = promptTokens + compTokens;
    const costUsd = calculateCost(item.model, promptTokens, compTokens);

    TelemetryRepository.create({
      tenant_id: acmeTenant.id,
      request_id: crypto.randomUUID(),
      provider: item.provider,
      model: item.model,
      prompt_tokens: promptTokens,
      completion_tokens: compTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd,
      endpoint: item.endpoint,
      status_code: 200,
      latency_ms: Math.floor(Math.random() * 800) + 150,
      metadata: JSON.stringify({ environment: 'production', trace_id: `trace_${i}` }),
    });
  }

  // Ingest Cost Spike Incident (gpt-4-turbo with 80k prompt tokens)
  const spikeTokens = 85_000;
  const spikeComp = 2_500;
  TelemetryRepository.create({
    tenant_id: acmeTenant.id,
    request_id: crypto.randomUUID(),
    provider: 'openai',
    model: 'gpt-4-turbo',
    prompt_tokens: spikeTokens,
    completion_tokens: spikeComp,
    total_tokens: spikeTokens + spikeComp,
    cost_usd: calculateCost('gpt-4-turbo', spikeTokens, spikeComp),
    endpoint: '/v1/batch-document-analysis',
    status_code: 200,
    latency_ms: 3200,
    metadata: JSON.stringify({ trigger: 'unbatched_pdf_scan' }),
  });

  // Ingest Runaway Loop on Starlight Apps (12 rapid calls)
  for (let j = 0; j < 12; j++) {
    TelemetryRepository.create({
      tenant_id: starlightTenant.id,
      request_id: crypto.randomUUID(),
      provider: 'openai',
      model: 'gpt-4o-mini',
      prompt_tokens: 300,
      completion_tokens: 50,
      total_tokens: 350,
      cost_usd: calculateCost('gpt-4o-mini', 300, 50),
      endpoint: '/v1/chat/loop-retry',
      status_code: 200,
      latency_ms: 85,
      metadata: JSON.stringify({ retry_attempt: j + 1 }),
    });
  }

  console.log('\n[5/5] Running Anomaly Detection Sweep on Seed Data...');
  const anomalies = AnomalyService.runAnomalySweep();
  console.log(`  ✓ Detected and recorded ${anomalies.length} anomalous incidents:`);
  anomalies.forEach((a) => {
    console.log(`    - [${a.severity}] ${a.anomaly_type}: ${a.description}`);
  });

  console.log('\n=====================================================');
  console.log('             Seed Completed Successfully!            ');
  console.log('=====================================================');
  console.log('\nDemo Credentials:');
  console.log('  Email:    admin@acme.com');
  console.log('  Password: Password123!');
  console.log(`  API Key:  ${acmeKey}`);
  console.log(`  Tenant ID (Acme):      ${acmeTenant.id}`);
  console.log(`  Tenant ID (Starlight): ${starlightTenant.id}`);
  console.log('\nReady to run: npm run dev\n');

  closeDb();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
