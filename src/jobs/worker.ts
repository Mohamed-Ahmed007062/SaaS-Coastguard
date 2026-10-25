import { EventEmitter } from 'events';
import { AnomalyService } from '../services/anomaly.service.js';

export interface BackgroundJob {
  id: string;
  type: 'ANOMALY_SWEEP' | 'DAILY_ROLLUP';
  tenantId?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  error?: string;
  result?: any;
  createdAt: string;
  completedAt?: string;
}

export class BackgroundQueue extends EventEmitter {
  private static instance: BackgroundQueue;
  private jobs: Map<string, BackgroundJob> = new Map();
  private isProcessing = false;

  private constructor() {
    super();
  }

  public static getInstance(): BackgroundQueue {
    if (!this.instance) {
      this.instance = new BackgroundQueue();
    }
    return this.instance;
  }

  public enqueue(type: BackgroundJob['type'], tenantId?: string): string {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: BackgroundJob = {
      id,
      type,
      tenantId,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(id, job);

    // Trigger execution off the request cycle (setImmediate / nextTick)
    setImmediate(() => this.processNext());

    return id;
  }

  public getJob(id: string): BackgroundJob | null {
    return this.jobs.get(id) || null;
  }

  public listRecentJobs(limit = 20): BackgroundJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing) return;

    const pending = Array.from(this.jobs.values()).find((j) => j.status === 'PENDING');
    if (!pending) return;

    this.isProcessing = true;
    pending.status = 'RUNNING';

    try {
      if (pending.type === 'ANOMALY_SWEEP') {
        const anomalies = AnomalyService.runAnomalySweep(pending.tenantId);
        pending.result = { detected_anomalies_count: anomalies.length, anomalies };
      }

      pending.status = 'COMPLETED';
      pending.completedAt = new Date().toISOString();
      this.emit('completed', pending);
    } catch (err: any) {
      pending.status = 'FAILED';
      pending.error = err.message;
      pending.completedAt = new Date().toISOString();
      this.emit('failed', pending);
    } finally {
      this.isProcessing = false;
      // Check for any more jobs in queue
      setImmediate(() => this.processNext());
    }
  }

  public clear(): void {
    this.jobs.clear();
  }
}
