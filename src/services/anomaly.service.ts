import crypto from 'crypto';
import { getDb } from '../db/database.js';
import { AnomalyRecord, Tenant } from '../types/index.js';
import { config } from '../config/index.js';
import { TenantRepository } from '../repositories/tenant.repository.js';

export class AnomalyService {
  /**
   * Run comprehensive anomaly detection sweep across one or all tenants
   */
  public static runAnomalySweep(targetTenantId?: string): AnomalyRecord[] {
    const db = getDb();
    const createdAnomalies: AnomalyRecord[] = [];

    const tenants: Tenant[] = targetTenantId
      ? [TenantRepository.findById(targetTenantId)].filter(Boolean) as Tenant[]
      : (db.prepare('SELECT * FROM tenants').all() as Tenant[]);

    for (const tenant of tenants) {
      // 1. Detect Cost Spikes (single requests exceeding threshold)
      const spikeThreshold = config.anomalySpikeThresholdUsd;
      const spikeStmt = db.prepare(`
        SELECT u.*
        FROM usage_records u
        LEFT JOIN anomalies a ON a.usage_record_id = u.id AND a.anomaly_type = 'SPIKE_COST'
        WHERE u.tenant_id = ?
          AND u.cost_usd >= ?
          AND a.id IS NULL
        ORDER BY u.created_at DESC
        LIMIT 20
      `);

      const spikes = spikeStmt.all(tenant.id, spikeThreshold) as any[];
      for (const spike of spikes) {
        const anomaly = this.recordAnomaly({
          tenant_id: tenant.id,
          usage_record_id: spike.id,
          anomaly_type: 'SPIKE_COST',
          severity: spike.cost_usd > spikeThreshold * 3 ? 'CRITICAL' : 'HIGH',
          description: `Single LLM request cost $${spike.cost_usd.toFixed(4)} using model '${spike.model}' (${spike.total_tokens} tokens), exceeding threshold of $${spikeThreshold.toFixed(2)}.`,
          metadata: JSON.stringify({
            model: spike.model,
            cost_usd: spike.cost_usd,
            tokens: spike.total_tokens,
            endpoint: spike.endpoint,
          }),
        });
        createdAnomalies.push(anomaly);
      }

      // 2. Detect Runaway Loops (more than 10 requests to same endpoint/model within 60 seconds)
      const loopStmt = db.prepare(`
        SELECT
          model,
          endpoint,
          COUNT(*) as request_count,
          SUM(cost_usd) as total_loop_cost,
          MIN(created_at) as start_time,
          MAX(created_at) as end_time
        FROM usage_records
        WHERE tenant_id = ?
          AND datetime(created_at) >= datetime('now', '-5 minutes')
        GROUP BY model, endpoint
        HAVING request_count >= 10
      `);

      const loopCandidates = loopStmt.all(tenant.id) as any[];
      for (const candidate of loopCandidates) {
        // Check if we already alerted on this loop recently
        const recentAlert = db
          .prepare(`
            SELECT id FROM anomalies
            WHERE tenant_id = ?
              AND anomaly_type = 'RUNAWAY_LOOP'
              AND datetime(created_at) >= datetime('now', '-15 minutes')
          `)
          .get(tenant.id);

        if (!recentAlert) {
          const anomaly = this.recordAnomaly({
            tenant_id: tenant.id,
            anomaly_type: 'RUNAWAY_LOOP',
            severity: 'CRITICAL',
            description: `Potential runaway loop detected: ${candidate.request_count} requests to '${candidate.endpoint}' using '${candidate.model}' in the last 5 minutes. Total spend: $${Number(candidate.total_loop_cost).toFixed(4)}.`,
            metadata: JSON.stringify(candidate),
          });
          createdAnomalies.push(anomaly);
        }
      }

      // 3. Detect Budget Overruns (> 100% of monthly budget)
      const totalCostStmt = db.prepare(`
        SELECT COALESCE(SUM(cost_usd), 0.0) as total_spend
        FROM usage_records
        WHERE tenant_id = ?
      `);
      const { total_spend } = totalCostStmt.get(tenant.id) as { total_spend: number };

      if (tenant.monthly_budget_usd > 0 && total_spend >= tenant.monthly_budget_usd) {
        const existingBudgetAlert = db
          .prepare(`
            SELECT id FROM anomalies
            WHERE tenant_id = ?
              AND anomaly_type = 'BUDGET_EXCEEDED'
              AND datetime(created_at) >= datetime('now', '-24 hours')
          `)
          .get(tenant.id);

        if (!existingBudgetAlert) {
          const anomaly = this.recordAnomaly({
            tenant_id: tenant.id,
            anomaly_type: 'BUDGET_EXCEEDED',
            severity: 'CRITICAL',
            description: `Monthly budget of $${tenant.monthly_budget_usd.toFixed(2)} exceeded! Current total spend: $${total_spend.toFixed(2)} (${((total_spend / tenant.monthly_budget_usd) * 100).toFixed(1)}%).`,
            metadata: JSON.stringify({
              budget: tenant.monthly_budget_usd,
              current_spend: total_spend,
            }),
          });
          createdAnomalies.push(anomaly);
        }
      }
    }

    return createdAnomalies;
  }

  public static recordAnomaly(data: Omit<AnomalyRecord, 'id' | 'created_at'>): AnomalyRecord {
    const db = getDb();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO anomalies (
        id, tenant_id, usage_record_id, anomaly_type, severity, description, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.tenant_id,
      data.usage_record_id || null,
      data.anomaly_type,
      data.severity,
      data.description,
      data.metadata || null,
      createdAt
    );

    return {
      ...data,
      id,
      created_at: createdAt,
    };
  }

  public static listByTenant(tenantId: string, limit = 50): AnomalyRecord[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM anomalies
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(tenantId, limit) as AnomalyRecord[];
  }
}
