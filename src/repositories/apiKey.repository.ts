import crypto from 'crypto';
import { getDb } from '../db/database.js';
import { ApiKey } from '../types/index.js';

export class ApiKeyRepository {
  public static create(tenantId: string, name: string, keyHash: string): ApiKey {
    const db = getDb();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO api_keys (id, tenant_id, key_hash, name, revoked, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `);

    stmt.run(id, tenantId, keyHash, name, createdAt);

    return {
      id,
      tenant_id: tenantId,
      key_hash: keyHash,
      name,
      revoked: 0,
      created_at: createdAt,
    };
  }

  public static findByHash(keyHash: string): ApiKey | null {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM api_keys WHERE key_hash = ? AND revoked = 0');
    return (stmt.get(keyHash) as ApiKey) || null;
  }

  public static listByTenant(tenantId: string): Omit<ApiKey, 'key_hash'>[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, tenant_id, name, revoked, created_at
      FROM api_keys
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(tenantId) as Omit<ApiKey, 'key_hash'>[];
  }

  public static revoke(id: string, tenantId: string): boolean {
    const db = getDb();
    const stmt = db.prepare('UPDATE api_keys SET revoked = 1 WHERE id = ? AND tenant_id = ?');
    const result = stmt.run(id, tenantId);
    return result.changes > 0;
  }
}
