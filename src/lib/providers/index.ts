import type { AiProviderId, ProviderAdapter } from "./types.js";

export function getProvider(providerId: AiProviderId): ProviderAdapter {
  switch (providerId) {
    case "claude": {
      // Lazy import to avoid loading all providers at startup
      const { ClaudeAdapter } =
        require("./claude.js") as typeof import("./claude.js");
      return new ClaudeAdapter();
    }
    case "openai": {
      const { OpenAIAdapter } =
        require("./openai.js") as typeof import("./openai.js");
      return new OpenAIAdapter();
    }
    case "groq": {
      const { GroqAdapter } =
        require("./groq.js") as typeof import("./groq.js");
      return new GroqAdapter();
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
