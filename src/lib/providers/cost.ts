import type { AiProviderId } from "./types";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CostBreakdown {
  inputCostCents: number;
  outputCostCents: number;
  totalCostCents: number;
}

// Price per million tokens (in cents) — update when providers change pricing
const PRICING: Record<AiProviderId, { inputCentsPerMillion: number; outputCentsPerMillion: number }> = {
  claude:  { inputCentsPerMillion: 300,  outputCentsPerMillion: 1500 },  // Claude Sonnet 4
  openai:  { inputCentsPerMillion: 250,  outputCentsPerMillion: 1000 },  // GPT-4o
  groq:    { inputCentsPerMillion: 59,   outputCentsPerMillion: 79 },    // Llama 3.3 70B
};

/**
 * Calculate cost in cents from token usage for a given provider.
 */
export function calculateCost(providerId: AiProviderId, usage: TokenUsage): CostBreakdown {
  const prices = PRICING[providerId];
  const inputCostCents = Math.ceil((usage.inputTokens / 1_000_000) * prices.inputCentsPerMillion);
  const outputCostCents = Math.ceil((usage.outputTokens / 1_000_000) * prices.outputCentsPerMillion);
  return {
    inputCostCents,
    outputCostCents,
    totalCostCents: inputCostCents + outputCostCents,
  };
}

/**
 * Extract token usage from a Claude SDK result message.
 * Claude's final "result" messages include a `usage` field.
 */
export function extractClaudeUsage(raw: unknown): TokenUsage | null {
  if (!raw || typeof raw !== "object") return null;
  const msg = raw as Record<string, unknown>;

  // Claude Agent SDK result messages have usage at the top level
  if (msg.type === "result" && msg.usage && typeof msg.usage === "object") {
    const usage = msg.usage as Record<string, number>;
    return {
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
    };
  }

  // Also check for total_cost_usd (available in result messages)
  // but we prefer calculating from tokens for consistency
  return null;
}

/**
 * Extract token usage from an OpenAI/Groq chat completion response.
 * Both use the same response.usage shape.
 */
export function extractGenericUsage(usage: { prompt_tokens?: number; completion_tokens?: number } | null | undefined): TokenUsage | null {
  if (!usage) return null;
  return {
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: usage.completion_tokens ?? 0,
  };
}
