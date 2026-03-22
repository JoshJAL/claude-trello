import { describe, it, expect } from "vitest";
import {
  calculateCost,
  extractClaudeUsage,
  extractGenericUsage,
} from "#/lib/providers/cost";

describe("calculateCost", () => {
  it("calculates Claude costs correctly", () => {
    const result = calculateCost("claude", {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(result.inputCostCents).toBe(300);
    expect(result.outputCostCents).toBe(1500);
    expect(result.totalCostCents).toBe(1800);
  });

  it("calculates OpenAI costs correctly", () => {
    const result = calculateCost("openai", {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(result.inputCostCents).toBe(250);
    expect(result.outputCostCents).toBe(1000);
    expect(result.totalCostCents).toBe(1250);
  });

  it("calculates Groq costs correctly", () => {
    const result = calculateCost("groq", {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(result.inputCostCents).toBe(59);
    expect(result.outputCostCents).toBe(79);
    expect(result.totalCostCents).toBe(138);
  });

  it("returns zero for zero tokens", () => {
    const result = calculateCost("claude", {
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(result.totalCostCents).toBe(0);
  });

  it("rounds up fractional cents", () => {
    // 1 token of Claude input: (1 / 1_000_000) * 300 = 0.0003 → ceil = 1
    const result = calculateCost("claude", {
      inputTokens: 1,
      outputTokens: 0,
    });
    expect(result.inputCostCents).toBe(1);
  });

  it("handles small token counts", () => {
    const result = calculateCost("claude", {
      inputTokens: 500,
      outputTokens: 200,
    });
    // (500/1M)*300 = 0.15 → ceil = 1
    expect(result.inputCostCents).toBe(1);
    // (200/1M)*1500 = 0.3 → ceil = 1
    expect(result.outputCostCents).toBe(1);
    expect(result.totalCostCents).toBe(2);
  });
});

describe("extractClaudeUsage", () => {
  it("extracts usage from a result message", () => {
    const result = extractClaudeUsage({
      type: "result",
      usage: { input_tokens: 1000, output_tokens: 500 },
    });
    expect(result).toEqual({ inputTokens: 1000, outputTokens: 500 });
  });

  it("returns null for non-result messages", () => {
    expect(extractClaudeUsage({ type: "assistant", content: "hi" })).toBeNull();
  });

  it("returns null for null/undefined input", () => {
    expect(extractClaudeUsage(null)).toBeNull();
    expect(extractClaudeUsage(undefined)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(extractClaudeUsage("string")).toBeNull();
    expect(extractClaudeUsage(42)).toBeNull();
  });

  it("handles missing usage fields with defaults", () => {
    const result = extractClaudeUsage({
      type: "result",
      usage: {},
    });
    expect(result).toEqual({ inputTokens: 0, outputTokens: 0 });
  });
});

describe("extractGenericUsage", () => {
  it("extracts usage from OpenAI/Groq response", () => {
    const result = extractGenericUsage({
      prompt_tokens: 800,
      completion_tokens: 300,
    });
    expect(result).toEqual({ inputTokens: 800, outputTokens: 300 });
  });

  it("returns null for null/undefined", () => {
    expect(extractGenericUsage(null)).toBeNull();
    expect(extractGenericUsage(undefined)).toBeNull();
  });

  it("handles partial usage data", () => {
    expect(extractGenericUsage({ prompt_tokens: 100 })).toEqual({
      inputTokens: 100,
      outputTokens: 0,
    });
    expect(extractGenericUsage({ completion_tokens: 50 })).toEqual({
      inputTokens: 0,
      outputTokens: 50,
    });
  });
});
