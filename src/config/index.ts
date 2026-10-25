import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'saas_costguard_default_jwt_secret_flyrank_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  databasePath: process.env.DATABASE_PATH || './data/costguard.db',
  anomalySpikeThresholdUsd: parseFloat(process.env.ANOMALY_SPIKE_THRESHOLD_USD || '0.50'),
  cronScheduleAnomaly: process.env.CRON_SCHEDULE_ANOMALY || '*/15 * * * *',
  cronScheduleDailyRollup: process.env.CRON_SCHEDULE_DAILY_ROLLUP || '0 0 * * *',
  llmProvider: process.env.LLM_PROVIDER || 'mock',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
};
