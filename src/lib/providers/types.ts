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

export const AI_PROVIDER_IDS: AiProviderId[] = ["claude", "openai", "groq"];

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
}

export interface ProviderAdapter {
  readonly providerId: AiProviderId;
  launchSession(params: ProviderSessionParams): ProviderSession;
  launchCardAgent(params: ProviderCardAgentParams): ProviderSession;
}
