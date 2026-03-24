import {
  launchClaudeSession,
  launchCardAgent,
} from "#/lib/claude";
import type {
  ProviderAdapter,
  ProviderSession,
  ProviderSessionParams,
  ProviderCardAgentParams,
  AgentMessage,
} from "./types.js";

/**
 * Wraps the Claude Agent SDK's async-iterable Query into a ProviderSession.
 * Yields raw SDK messages as AgentMessage with `raw` field for backward compat.
 */
function wrapClaudeQuery(
  query: AsyncIterable<Record<string, unknown>> & { close?: () => void },
): ProviderSession {
  const session: ProviderSession = {
    [Symbol.asyncIterator]() {
      const iterator = query[Symbol.asyncIterator]();
      return {
        async next(): Promise<IteratorResult<AgentMessage>> {
          const result = await iterator.next();
          if (result.done) return { done: true, value: undefined };

          const msg = result.value;
          // Pass through the raw message for backward compat with existing SSE hooks
          // The existing useClaudeSession hook parses these directly
          return {
            done: false,
            value: {
              type: (msg.type as AgentMessage["type"]) ?? "assistant",
              raw: msg,
            },
          };
        },
      };
    },
    close() {
      if (typeof query.close === "function") {
        query.close();
      }
    },
  };
  return session;
}

export class ClaudeAdapter implements ProviderAdapter {
  readonly providerId = "claude" as const;

  launchSession(params: ProviderSessionParams): ProviderSession {
    const query = launchClaudeSession({
      anthropicApiKey: params.apiKey,
      trelloToken: params.trelloToken,
      boardData: params.boardData,
      cwd: params.cwd,
      userMessage: params.userMessage,
      abortController: params.abortController,
      source: params.sourceContext?.source,
      sourceToken: params.sourceContext?.sourceToken,
      githubOwner: params.sourceContext?.githubOwner,
      githubRepo: params.sourceContext?.githubRepo,
      gitlabProjectId: params.sourceContext?.gitlabProjectId,
    });

    return wrapClaudeQuery(
      query as unknown as AsyncIterable<Record<string, unknown>> & {
        close: () => void;
      },
    );
  }

  launchCardAgent(params: ProviderCardAgentParams): ProviderSession {
    const query = launchCardAgent({
      anthropicApiKey: params.apiKey,
      trelloToken: params.trelloToken,
      card: params.card,
      boardId: params.boardId,
      boardName: params.boardName,
      cwd: params.cwd,
      userMessage: params.userMessage,
      abortController: params.abortController,
      source: params.sourceContext?.source,
      sourceToken: params.sourceContext?.sourceToken,
      githubOwner: params.sourceContext?.githubOwner,
      githubRepo: params.sourceContext?.githubRepo,
      gitlabProjectId: params.sourceContext?.gitlabProjectId,
    });

    return wrapClaudeQuery(
      query as unknown as AsyncIterable<Record<string, unknown>> & {
        close: () => void;
      },
    );
  }
}
