import { ModelPricing } from '../types/index.js';

// Cost per 1,000 tokens in USD
export const MODEL_PRICING_TABLE: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': { promptCostPer1k: 0.0025, completionCostPer1k: 0.01 },
  'gpt-4o-mini': { promptCostPer1k: 0.00015, completionCostPer1k: 0.0006 },
  'gpt-4-turbo': { promptCostPer1k: 0.01, completionCostPer1k: 0.03 },

  // Anthropic
  'claude-3-5-sonnet': { promptCostPer1k: 0.003, completionCostPer1k: 0.015 },
  'claude-3-5-haiku': { promptCostPer1k: 0.0008, completionCostPer1k: 0.004 },

  // Google Gemini
  'gemini-1.5-pro': { promptCostPer1k: 0.00125, completionCostPer1k: 0.005 },
  'gemini-1.5-flash': { promptCostPer1k: 0.000075, completionCostPer1k: 0.0003 },
  'gemini-2.0-flash': { promptCostPer1k: 0.0001, completionCostPer1k: 0.0004 },

  // Meta / Groq
  'llama-3.3-70b': { promptCostPer1k: 0.00059, completionCostPer1k: 0.00079 },
  'llama-3.1-8b': { promptCostPer1k: 0.00005, completionCostPer1k: 0.00008 },
};

const DEFAULT_PRICING: ModelPricing = {
  promptCostPer1k: 0.001,
  completionCostPer1k: 0.002,
};

export function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const normalizedModel = model.toLowerCase().trim();
  const pricing = MODEL_PRICING_TABLE[normalizedModel] || DEFAULT_PRICING;

  const promptCost = (promptTokens / 1000) * pricing.promptCostPer1k;
  const completionCost = (completionTokens / 1000) * pricing.completionCostPer1k;

  const totalCost = promptCost + completionCost;
  // Round to 6 decimal places to prevent floating point drift
  return Math.round(totalCost * 1_000_000) / 1_000_000;
}
