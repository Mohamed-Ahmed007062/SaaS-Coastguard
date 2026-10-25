import { createApp } from './app.js';
import { config } from './config/index.js';
import { getDb } from './db/database.js';
import { TenantRepository } from './repositories/tenant.repository.js';

async function bootstrap() {
  try {
    // 1. Initialize SQLite database & default tenant
    console.log(`[CostGuard] Initializing database at: ${config.databasePath}`);
    getDb();
    const defaultTenant = TenantRepository.ensureDefaultTenant();
    console.log(`[CostGuard] Database ready. Default tenant: ${defaultTenant.name} (${defaultTenant.id})`);

    // 2. Start Express Server
    const app = createApp();
    const server = app.listen(config.port, () => {
      console.log(`[CostGuard] Server running on http://localhost:${config.port}`);
      console.log(`[CostGuard] Health check available at: http://localhost:${config.port}/health`);
      console.log(`[CostGuard] Telemetry endpoint: POST http://localhost:${config.port}/api/v1/telemetry`);
    });

    // Graceful Shutdown
    const shutdown = () => {
      console.log('\n[CostGuard] Shutting down gracefully...');
      server.close(() => {
        console.log('[CostGuard] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('[CostGuard] Fatal startup error:', error);
    process.exit(1);
  }
}

bootstrap();
