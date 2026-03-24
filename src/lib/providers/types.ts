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

export const PROVIDER_MODELS: Record<AiProviderId, Array<{ id: string; label: string }>> = {
  claude: [
    { id: "claude-opus-4-20250514", label: "Opus 4" },
    { id: "claude-sonnet-4-20250514", label: "Sonnet 4" },
    { id: "claude-haiku-3-5-20241022", label: "Haiku 3.5" },
  ],
  openai: [
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4o-mini", label: "GPT-4o Mini" },
    { id: "gpt-4.1", label: "GPT-4.1" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { id: "o3-mini", label: "o3 Mini" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
    { id: "gemma2-9b-it", label: "Gemma 2 9B" },
  ],
};

export const DEFAULT_MODEL: Record<AiProviderId, string> = {
  claude: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
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
