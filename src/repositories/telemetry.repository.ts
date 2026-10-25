import crypto from 'crypto';
import { getDb } from '../db/database.js';
import { UsageRecord } from '../types/index.js';

export class TelemetryRepository {
  public static create(record: Omit<UsageRecord, 'id' | 'created_at'>): UsageRecord {
    const db = getDb();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO usage_records (
        id, tenant_id, request_id, provider, model,
        prompt_tokens, completion_tokens, total_tokens,
        cost_usd, endpoint, status_code, latency_ms,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      record.tenant_id,
      record.request_id,
      record.provider,
      record.model,
      record.prompt_tokens,
      record.completion_tokens,
      record.total_tokens,
      record.cost_usd,
      record.endpoint,
      record.status_code,
      record.latency_ms,
      record.metadata || null,
      createdAt
    );

    return {
      ...record,
      id,
      created_at: createdAt,
    };
  }

  public static findById(id: string): UsageRecord | null {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM usage_records WHERE id = ?');
    return (stmt.get(id) as UsageRecord) || null;
  }

  public static findByTenant(tenantId: string, limit = 50): UsageRecord[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM usage_records
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(tenantId, limit) as UsageRecord[];
  }
}
