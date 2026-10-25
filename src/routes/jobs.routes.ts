import { Router, Request, Response } from 'express';
import { BackgroundQueue } from '../jobs/worker.js';
import { AnomalyService } from '../services/anomaly.service.js';
import { TenantRepository } from '../repositories/tenant.repository.js';

export const jobsRouter = Router();
const queue = BackgroundQueue.getInstance();

// Enqueue background anomaly detection sweep
jobsRouter.post('/anomaly-sweep', (req: Request, res: Response): void => {
  const tenantId = (req.body?.tenant_id as string) || (req.query?.tenant_id as string);
  const jobId = queue.enqueue('ANOMALY_SWEEP', tenantId);

  res.status(202).json({
    success: true,
    message: 'Anomaly sweep enqueued in background',
    job_id: jobId,
    status_url: `/api/v1/jobs/${jobId}`,
  });
});

// Check background job status
jobsRouter.get('/:id', (req: Request, res: Response): void => {
  const job = queue.getJob(req.params.id);
  if (!job) {
    res.status(404).json({
      success: false,
      error: 'Job not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: job,
  });
});

// List recent background jobs
jobsRouter.get('/', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: queue.listRecentJobs(),
  });
});

export const anomaliesRouter = Router();

// List anomalies for a tenant
anomaliesRouter.get('/', (req: Request, res: Response): void => {
  try {
    let tenantId = req.query.tenant_id as string | undefined;
    if (!tenantId) {
      tenantId = TenantRepository.ensureDefaultTenant().id;
    }

    const limit = parseInt((req.query.limit as string) || '50', 10);
    const anomalies = AnomalyService.listByTenant(tenantId, limit);

    res.status(200).json({
      success: true,
      tenant_id: tenantId,
      count: anomalies.length,
      data: anomalies,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve anomalies',
      details: err.message,
    });
  }
});
