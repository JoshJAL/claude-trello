import type { AiProviderId, ProviderAdapter } from "./types.js";
import type { ToolSet } from "./source-tools.js";
import type { BoardData } from "#/lib/types";

export type SessionMode = "local" | "web";

export type UserPromptFn = (boardData: BoardData, userMessage?: string) => string;

export interface WebModeConfig {
  systemPrompt: string;
  toolSet: ToolSet;
  buildUserPrompt: UserPromptFn;
}

/**
 * Get a provider adapter. In local mode, returns the standard adapter.
 * In web mode, returns an adapter configured with the given tool set and prompt.
 */
export async function getProvider(
  providerId: AiProviderId,
  mode: SessionMode = "local",
  webConfig?: WebModeConfig,
): Promise<ProviderAdapter> {
  if (mode === "web" && webConfig) {
    return getWebProvider(providerId, webConfig);
  }

  switch (providerId) {
    case "claude": {
      const { ClaudeAdapter } = await import("./claude.js");
      return new ClaudeAdapter();
    }
    case "openai": {
      const { OpenAIAdapter } = await import("./openai.js");
      return new OpenAIAdapter();
    }
    case "groq": {
      const { GroqAdapter } = await import("./groq.js");
      return new GroqAdapter();
    }
    default:
      throw new Error(`Unknown AI provider: ${providerId}`);
  }
}

async function getWebProvider(
  providerId: AiProviderId,
  webConfig: WebModeConfig,
): Promise<ProviderAdapter> {
  switch (providerId) {
    case "claude": {
      const { ClaudeWebAdapter } = await import("./claude-web.js");
      return new ClaudeWebAdapter(webConfig.systemPrompt, webConfig.toolSet, webConfig.buildUserPrompt);
    }
    case "openai": {
      const { OpenAIWebAdapter } = await import("./openai-web.js");
      return new OpenAIWebAdapter(webConfig.systemPrompt, webConfig.toolSet, webConfig.buildUserPrompt);
    }
    case "groq": {
      const { GroqWebAdapter } = await import("./groq-web.js");
      return new GroqWebAdapter(webConfig.systemPrompt, webConfig.toolSet, webConfig.buildUserPrompt);
    }
    default:
      throw new Error(`Unknown AI provider: ${providerId}`);
  }
}

export type {
  AiProviderId,
  ProviderAdapter,
  ProviderSession,
  ProviderSessionParams,
  ProviderCardAgentParams,
  AgentMessage,
} from "./types.js";
export { AI_PROVIDERS, AI_PROVIDER_IDS } from "./types.js";
