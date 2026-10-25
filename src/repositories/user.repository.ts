import crypto from 'crypto';
import { getDb } from '../db/database.js';
import { User } from '../types/index.js';

export class UserRepository {
  public static create(
    tenantId: string,
    email: string,
    passwordHash: string,
    role: 'admin' | 'member' = 'admin'
  ): User {
    const db = getDb();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO users (id, tenant_id, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, tenantId, email.toLowerCase().trim(), passwordHash, role, createdAt);

    return {
      id,
      tenant_id: tenantId,
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      role,
      created_at: createdAt,
    };
  }

  public static findByEmail(email: string): User | null {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return (stmt.get(email.toLowerCase().trim()) as User) || null;
  }

  public static findById(id: string): User | null {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return (stmt.get(id) as User) || null;
  }
}
