import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';

export const healthRouter = Router();

healthRouter.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const result = db.prepare('SELECT 1 as healthy').get() as { healthy: number };

    res.status(200).json({
      status: 'ok',
      service: 'saas-costguard',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      database: result.healthy === 1 ? 'connected' : 'unhealthy',
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      service: 'saas-costguard',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    });
  }
});
