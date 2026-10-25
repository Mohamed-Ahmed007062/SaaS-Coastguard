import express, { Express, Request, Response, NextFunction } from 'express';
import { healthRouter } from './routes/health.routes.js';
import { telemetryRouter } from './routes/telemetry.routes.js';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root welcome & summary
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'SaaS CostGuard API',
      description: 'LLM & API Token Metering, Anomaly Detection & Financial Reporting Engine',
      version: '1.0.0',
      status: 'operational',
      docs: {
        health: 'GET /health',
        telemetry: 'POST /api/v1/telemetry',
        records: 'GET /api/v1/telemetry',
      },
    });
  });

  // Mount Routes
  app.use('/health', healthRouter);
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/telemetry', telemetryRouter);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  return app;
}
