import { Router, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';
import { CacheService } from '../services/cache.service.js';
import { TenantRepository } from '../repositories/tenant.repository.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AuthService } from '../services/auth.service.js';

export const analyticsRouter = Router();

analyticsRouter.get('/summary', (req: AuthenticatedRequest, res: Response): void => {
  try {
    let tenantId = req.query.tenant_id as string | undefined;

    // Check optional bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = AuthService.verifyJwt(authHeader.split(' ')[1]);
        tenantId = decoded.tenantId;
      } catch {
        // Continue to query param fallback
      }
    }

    if (!tenantId) {
      tenantId = TenantRepository.ensureDefaultTenant().id;
    }

    const bypassCache = req.query.no_cache === 'true';
    const summary = AnalyticsService.getTenantSummary(tenantId, bypassCache);

    res.setHeader('X-Cache', summary.from_cache ? 'HIT' : 'MISS');
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics summary',
      details: error.message,
    });
  }
});

analyticsRouter.get('/cache-stats', (req: AuthenticatedRequest, res: Response): void => {
  const stats = CacheService.getStats();
  res.status(200).json({
    success: true,
    data: stats,
  });
});

analyticsRouter.post('/cache-clear', (req: AuthenticatedRequest, res: Response): void => {
  CacheService.clear();
  res.status(200).json({
    success: true,
    message: 'Cache cleared successfully',
  });
});
