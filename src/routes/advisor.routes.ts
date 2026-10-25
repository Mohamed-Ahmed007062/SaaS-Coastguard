import { Router, Request, Response } from 'express';
import { LLMService } from '../services/llm.service.js';
import { TenantRepository } from '../repositories/tenant.repository.js';

export const advisorRouter = Router();

advisorRouter.post('/optimize', async (req: Request, res: Response): Promise<void> => {
  try {
    let tenantId = (req.body?.tenant_id as string) || (req.query?.tenant_id as string);
    if (!tenantId) {
      tenantId = TenantRepository.ensureDefaultTenant().id;
    }

    const tenant = TenantRepository.findById(tenantId);
    if (!tenant) {
      res.status(404).json({
        success: false,
        error: `Tenant '${tenantId}' not found`,
      });
      return;
    }

    const advice = await LLMService.generateOptimizationAdvice(tenantId);

    res.status(200).json({
      success: true,
      message: 'AI cost optimization advice generated successfully',
      data: advice,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate optimization advice',
      details: err.message,
    });
  }
});
