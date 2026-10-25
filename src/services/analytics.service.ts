import { getDb } from '../db/database.js';
import { CacheService } from './cache.service.js';
import { TenantRepository } from '../repositories/tenant.repository.js';

export interface ModelSpendBreakdown {
  model: string;
  provider: string;
  request_count: number;
  total_tokens: number;
  total_cost_usd: number;
  percentage_of_total_cost: number;
}

export interface TenantSpendingSummary {
  tenant_id: string;
  tenant_name: string;
  monthly_budget_usd: number;
  total_requests: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  budget_used_percentage: number;
  average_latency_ms: number;
  models: ModelSpendBreakdown[];
  calculated_at: string;
  from_cache?: boolean;
}

export class AnalyticsService {
  public static getTenantSummary(tenantId: string, bypassCache = false): TenantSpendingSummary {
    const cacheKey = `summary:${tenantId}`;

    if (!bypassCache) {
      const cached = CacheService.get<TenantSpendingSummary>(cacheKey);
      if (cached) {
        return {
          ...cached,
          from_cache: true,
        };
      }
    }

    const db = getDb();
    const tenant = TenantRepository.findById(tenantId);
    if (!tenant) {
      throw new Error(`Tenant '${tenantId}' not found`);
    }

    // 1. Overall aggregation
    const overallStmt = db.prepare(`
      SELECT
        COUNT(*) as total_requests,
        COALESCE(SUM(prompt_tokens), 0) as total_prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) as total_completion_tokens,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(cost_usd), 0.0) as total_cost_usd,
        COALESCE(AVG(latency_ms), 0.0) as average_latency_ms
      FROM usage_records
      WHERE tenant_id = ?
    `);

    const overall = overallStmt.get(tenantId) as {
      total_requests: number;
      total_prompt_tokens: number;
      total_completion_tokens: number;
      total_tokens: number;
      total_cost_usd: number;
      average_latency_ms: number;
    };

    const totalCostUsd = Math.round(overall.total_cost_usd * 1_000_000) / 1_000_000;

    // 2. Per-model breakdown
    const modelStmt = db.prepare(`
      SELECT
        model,
        provider,
        COUNT(*) as request_count,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(cost_usd), 0.0) as total_cost_usd
      FROM usage_records
      WHERE tenant_id = ?
      GROUP BY model, provider
      ORDER BY total_cost_usd DESC
    `);

    const rawModels = modelStmt.all(tenantId) as Array<{
      model: string;
      provider: string;
      request_count: number;
      total_tokens: number;
      total_cost_usd: number;
    }>;

    const models: ModelSpendBreakdown[] = rawModels.map((m) => {
      const cost = Math.round(m.total_cost_usd * 1_000_000) / 1_000_000;
      const pct = totalCostUsd > 0 ? Math.round((cost / totalCostUsd) * 1000) / 10 : 0;
      return {
        model: m.model,
        provider: m.provider,
        request_count: m.request_count,
        total_tokens: m.total_tokens,
        total_cost_usd: cost,
        percentage_of_total_cost: pct,
      };
    });

    const budgetUsedPct =
      tenant.monthly_budget_usd > 0
        ? Math.round((totalCostUsd / tenant.monthly_budget_usd) * 1000) / 10
        : 0;

    const summary: TenantSpendingSummary = {
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      monthly_budget_usd: tenant.monthly_budget_usd,
      total_requests: overall.total_requests,
      total_prompt_tokens: overall.total_prompt_tokens,
      total_completion_tokens: overall.total_completion_tokens,
      total_tokens: overall.total_tokens,
      total_cost_usd: totalCostUsd,
      budget_used_percentage: budgetUsedPct,
      average_latency_ms: Math.round(overall.average_latency_ms),
      models,
      calculated_at: new Date().toISOString(),
      from_cache: false,
    };

    // Store in cache with 60s TTL
    CacheService.set(cacheKey, summary, 60_000);

    return summary;
  }

  public static invalidateTenantCache(tenantId: string): void {
    CacheService.del(`summary:${tenantId}`);
  }
}
