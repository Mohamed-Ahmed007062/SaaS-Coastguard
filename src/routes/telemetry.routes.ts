import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { validateBody } from '../middleware/validation.js';
import { TelemetryRepository } from '../repositories/telemetry.repository.js';
import { TenantRepository } from '../repositories/tenant.repository.js';
import { calculateCost } from '../services/pricing.service.js';

export const telemetryRouter = Router();

const telemetryIngestSchema = z.object({
  tenant_id: z.string().optional(),
  request_id: z.string().optional(),
  provider: z.string().min(1, 'Provider is required'),
  model: z.string().min(1, 'Model name is required'),
  prompt_tokens: z.number().int().nonnegative('Prompt tokens must be non-negative'),
  completion_tokens: z.number().int().nonnegative('Completion tokens must be non-negative'),
  endpoint: z.string().default('/v1/chat/completions'),
  status_code: z.number().int().default(200),
  latency_ms: z.number().int().nonnegative().default(0),
  metadata: z.record(z.any()).optional(),
});

telemetryRouter.post(
  '/',
  validateBody(telemetryIngestSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = req.body;

      // Ensure tenant exists or fallback to default
      let tenantId = payload.tenant_id;
      if (!tenantId) {
        const defaultTenant = TenantRepository.ensureDefaultTenant();
        tenantId = defaultTenant.id;
      } else {
        const tenant = TenantRepository.findById(tenantId);
        if (!tenant) {
          res.status(404).json({
            success: false,
            error: `Tenant with ID '${tenantId}' does not exist`,
          });
          return;
        }
      }

      const totalTokens = payload.prompt_tokens + payload.completion_tokens;
      const costUsd = calculateCost(payload.model, payload.prompt_tokens, payload.completion_tokens);
      const requestId = payload.request_id || crypto.randomUUID();

      const record = TelemetryRepository.create({
        tenant_id: tenantId,
        request_id: requestId,
        provider: payload.provider.toLowerCase(),
        model: payload.model.toLowerCase(),
        prompt_tokens: payload.prompt_tokens,
        completion_tokens: payload.completion_tokens,
        total_tokens: totalTokens,
        cost_usd: costUsd,
        endpoint: payload.endpoint,
        status_code: payload.status_code,
        latency_ms: payload.latency_ms,
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Telemetry recorded successfully',
        data: {
          id: record.id,
          request_id: record.request_id,
          tenant_id: record.tenant_id,
          model: record.model,
          prompt_tokens: record.prompt_tokens,
          completion_tokens: record.completion_tokens,
          total_tokens: record.total_tokens,
          cost_usd: record.cost_usd,
          created_at: record.created_at,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to record telemetry',
        details: error.message,
      });
    }
  }
);

telemetryRouter.get('/', (req: Request, res: Response): void => {
  try {
    const tenantId = (req.query.tenant_id as string) || TenantRepository.ensureDefaultTenant().id;
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);

    const records = TelemetryRepository.findByTenant(tenantId, limit);
    res.status(200).json({
      success: true,
      tenant_id: tenantId,
      count: records.length,
      data: records,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve telemetry',
      details: error.message,
    });
  }
});
