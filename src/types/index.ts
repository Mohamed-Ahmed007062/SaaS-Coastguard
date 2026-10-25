export interface Tenant {
  id: string;
  name: string;
  slug: string;
  monthly_budget_usd: number;
  created_at: string;
}

export interface ApiKey {
  id: string;
  tenant_id: string;
  key_hash: string;
  name: string;
  created_at: string;
  revoked: number;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'member';
  created_at: string;
}

export interface UsageRecord {
  id: string;
  tenant_id: string;
  request_id: string;
  provider: string; // openai | anthropic | gemini | groq | custom
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  endpoint: string;
  status_code: number;
  latency_ms: number;
  metadata?: string;
  created_at: string;
}

export interface AnomalyRecord {
  id: string;
  tenant_id: string;
  usage_record_id?: string;
  anomaly_type: 'SPIKE_COST' | 'SPIKE_TOKENS' | 'RUNAWAY_LOOP' | 'BUDGET_EXCEEDED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  metadata?: string;
  created_at: string;
}

export interface DailyRollup {
  id: string;
  tenant_id: string;
  date: string; // YYYY-MM-DD
  total_requests: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_cost_usd: number;
  created_at: string;
}

export interface ModelPricing {
  promptCostPer1k: number;
  completionCostPer1k: number;
}
