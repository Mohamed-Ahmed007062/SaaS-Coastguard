import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, closeDb } from '../src/db/database.js';
import fs from 'fs';

describe('Milestone 2 - The Walking Skeleton', () => {
  const app = createApp();

  beforeAll(() => {
    // Ensure clean in-memory or test database
    getDb();
  });

  afterAll(() => {
    closeDb();
  });

  it('Health Check: returns 200 OK and database connected', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('saas-costguard');
    expect(res.body.database).toBe('connected');
  });

  it('Walking Skeleton Slice: POST /api/v1/telemetry saves usage record to database and calculates cost', async () => {
    const telemetryPayload = {
      provider: 'openai',
      model: 'gpt-4o',
      prompt_tokens: 1500,
      completion_tokens: 500,
      endpoint: '/v1/chat/completions',
      latency_ms: 340,
    };

    const res = await request(app)
      .post('/api/v1/telemetry')
      .send(telemetryPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.model).toBe('gpt-4o');
    expect(res.body.data.prompt_tokens).toBe(1500);
    expect(res.body.data.completion_tokens).toBe(500);
    expect(res.body.data.total_tokens).toBe(2000);

    // Verify calculated cost:
    // gpt-4o pricing: 1500 * (0.0025 / 1000) + 500 * (0.01 / 1000)
    // = 0.00375 + 0.00500 = 0.00875
    expect(res.body.data.cost_usd).toBe(0.00875);

    // Verify DB persistence by querying telemetry list
    const getRes = await request(app).get('/api/v1/telemetry');
    expect(getRes.status).toBe(200);
    expect(getRes.body.count).toBeGreaterThanOrEqual(1);

    const savedRecord = getRes.body.data.find((r: any) => r.id === res.body.data.id);
    expect(savedRecord).toBeDefined();
    expect(savedRecord.cost_usd).toBe(0.00875);
    expect(savedRecord.total_tokens).toBe(2000);
  });

  it('Validation Guard: returns 400 Bad Request when required fields are missing or invalid', async () => {
    const invalidPayload = {
      provider: 'openai',
      // missing model
      prompt_tokens: -10, // negative tokens invalid
    };

    const res = await request(app)
      .post('/api/v1/telemetry')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues).toBeDefined();
  });
});
