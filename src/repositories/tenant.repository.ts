import crypto from 'crypto';
import { getDb } from '../db/database.js';
import { Tenant } from '../types/index.js';

export class TenantRepository {
  public static create(name: string, slug: string, monthlyBudgetUsd = 50.0): Tenant {
    const db = getDb();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO tenants (id, name, slug, monthly_budget_usd, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, slug, monthlyBudgetUsd, createdAt);

    return {
      id,
      name,
      slug,
      monthly_budget_usd: monthlyBudgetUsd,
      created_at: createdAt,
    };
  }

  public static findById(id: string): Tenant | null {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM tenants WHERE id = ?');
    return (stmt.get(id) as Tenant) || null;
  }

  public static findBySlug(slug: string): Tenant | null {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM tenants WHERE slug = ?');
    return (stmt.get(slug) as Tenant) || null;
  }

  public static ensureDefaultTenant(): Tenant {
    const existing = this.findBySlug('default-org');
    if (existing) {
      return existing;
    }
    return this.create('Default Organization', 'default-org', 100.0);
  }
}
