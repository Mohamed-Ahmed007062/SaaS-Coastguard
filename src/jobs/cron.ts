import cron, { ScheduledTask } from 'node-cron';
import { config } from '../config/index.js';
import { BackgroundQueue } from './worker.js';

let anomalyTask: ScheduledTask | null = null;

export function startCronJobs(): void {
  if (process.env.NODE_ENV === 'test') {
    // Skip auto-scheduling in automated tests to prevent open handles
    return;
  }

  console.log(`[Cron] Scheduling anomaly detection job: ${config.cronScheduleAnomaly}`);
  anomalyTask = cron.schedule(config.cronScheduleAnomaly, () => {
    console.log('[Cron] Running scheduled anomaly sweep...');
    const queue = BackgroundQueue.getInstance();
    queue.enqueue('ANOMALY_SWEEP');
  });
}

export function stopCronJobs(): void {
  if (anomalyTask) {
    anomalyTask.stop();
    anomalyTask = null;
    console.log('[Cron] Stopped scheduled cron jobs.');
  }
}
