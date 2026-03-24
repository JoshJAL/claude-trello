import type { BoardData, TrelloCard } from "#/lib/types";

// ── Supported AI Providers ──────────────────────────────────────────────────

export type AiProviderId = "claude" | "openai" | "groq";

export const AI_PROVIDERS: Record<
  AiProviderId,
  { label: string; keyPrefix: string; keyPattern: RegExp; consoleUrl: string }
> = {
  claude: {
    label: "Anthropic (Claude)",
    keyPrefix: "sk-ant-api03-",
    keyPattern: /^sk-ant-api03-.+/,
    consoleUrl: "https://console.anthropic.com",
  },
  openai: {
    label: "OpenAI (ChatGPT)",
    keyPrefix: "sk-",
    keyPattern: /^sk-(?!ant-).+/,
    consoleUrl: "https://platform.openai.com/api-keys",
  },
  groq: {
    label: "Groq",
    keyPrefix: "gsk_",
    keyPattern: /^gsk_.+/,
    consoleUrl: "https://console.groq.com/keys",
  },
};

/** Short display names for use in UI labels and placeholders */
export const PROVIDER_SHORT_LABELS: Record<AiProviderId, string> = {
  claude: "Claude",
  openai: "ChatGPT",
  groq: "Groq",
};

/** Preferred provider display order (alphabetical by label). */
export const PROVIDER_ORDER: AiProviderId[] = ["claude", "openai", "groq"];

export const PROVIDER_MODELS: Record<AiProviderId, Array<{ id: string; label: string }>> = {
  claude: [
    { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
    { id: "claude-opus-4-6-20250827", label: "Opus 4.6" },
    { id: "claude-sonnet-4-6-20250827", label: "Sonnet 4.6" },
  ],
  openai: [
    { id: "gpt-5.4-2026-03-05", label: "GPT-5.4" },
    { id: "gpt-5.4-mini-2026-03-17", label: "GPT-5.4 Mini" },
    { id: "gpt-5.4-nano-2026-03-17", label: "GPT-5.4 Nano" },
  ],
  groq: [
    { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
    { id: "moonshotai/kimi-k2-instruct-0905", label: "Kimi K2" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout" },
    { id: "qwen/qwen-3-32b", label: "Qwen 3 32B" },
  ],
};

export const DEFAULT_MODEL: Record<AiProviderId, string> = {
  claude: "claude-sonnet-4-6-20250827",
  openai: "gpt-5.4-2026-03-05",
  groq: "llama-3.3-70b-versatile",
};

// ── Normalized Agent Message ────────────────────────────────────────────────

export interface AgentMessage {
  type:
    | "system"
    | "assistant"
    | "tool_use"
    | "tool_result"
    | "error"
    | "done";
  content?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
  /** Original provider-specific message (for backward compat in SSE) */
  raw?: unknown;
  /** Token usage for this turn (accumulated on final messages for non-Claude) */
  usage?: { inputTokens: number; outputTokens: number };
}

// ── Provider Session ────────────────────────────────────────────────────────

export interface ProviderSession extends AsyncIterable<AgentMessage> {
  close(): void;
}

// ── Provider Adapter Interface ──────────────────────────────────────────────

export interface SourceContext {
  source: "trello" | "github" | "gitlab";
  sourceToken: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabProjectId?: number;
}

export interface ProviderSessionParams {
  apiKey: string;
  trelloToken: string;
  boardData: BoardData;
  cwd: string;
  userMessage?: string;
  abortController?: AbortController;
  sourceContext?: SourceContext;
  modelId?: string;
}

export interface ProviderCardAgentParams {
  apiKey: string;
  trelloToken: string;
  card: TrelloCard;
  boardId: string;
  boardName: string;
  cwd: string;
  userMessage?: string;
  abortController?: AbortController;
  sourceContext?: SourceContext;
  modelId?: string;
}

export interface ProviderAdapter {
  readonly providerId: AiProviderId;
  launchSession(params: ProviderSessionParams): ProviderSession;
  launchCardAgent(params: ProviderCardAgentParams): ProviderSession;
}
