import { CODING_TOOLS, executeTool } from "./tools.js";
import type { ToolDefinition } from "./tools.js";
import type { AgentMessage, ProviderSession } from "./types.js";
import type { ToolSet } from "./source-tools.js";
import {
  updateCheckItem,
  moveCard,
  findOrCreateVerifyList,
} from "#/lib/trello";

export interface GenericAgentConfig {
  systemPrompt: string;
  userPrompt: string;
  cwd: string;
  maxTurns: number;
  trelloToken: string;
  boardId: string;
  abortController?: AbortController;
  /** Provider-specific chat completion function */
  chatCompletion: ChatCompletionFn;
  /** Optional configurable tool set — if provided, replaces hardcoded tools */
  toolSet?: ToolSet;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatCompletionFn = (
  messages: ChatMessage[],
  tools: ToolDefinition[],
  signal?: AbortSignal,
) => Promise<{
  content: string | null;
  tool_calls: ToolCall[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}>;

/**
 * Generic agent loop that works with any chat completion API
 * that supports function calling (OpenAI, Groq, etc.).
 *
 * When `config.toolSet` is provided, uses its definitions and executor
 * instead of the hardcoded CODING_TOOLS + Trello tools.
 */
export function createGenericAgentSession(
  config: GenericAgentConfig,
): ProviderSession {
  let closed = false;

  // If a custom toolSet is provided, use it exclusively.
  // Otherwise, fall back to the legacy hardcoded tools.
  const allTools: ToolDefinition[] = config.toolSet
    ? config.toolSet.definitions
    : [
        ...CODING_TOOLS,
        {
          name: "check_trello_item",
          description:
            "Mark a Trello checklist item as complete once the corresponding code task is done.",
          parameters: {
            type: "object",
            properties: {
              checkItemId: {
                type: "string",
                description: "The Trello checklist item ID",
              },
              cardId: {
                type: "string",
                description: "The Trello card ID",
              },
            },
            required: ["checkItemId", "cardId"],
          },
        },
        {
          name: "move_card_to_verify",
          description:
            "Move a Trello card to the Verify list after all its checklist items are completed.",
          parameters: {
            type: "object",
            properties: {
              cardId: {
                type: "string",
                description: "The Trello card ID to move to Verify",
              },
            },
            required: ["cardId"],
          },
        },
      ];

  async function handleToolCall(
    toolCall: ToolCall,
  ): Promise<string> {
    const name = toolCall.function.name;
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(toolCall.function.arguments);
    } catch {
      return `Error: Invalid JSON arguments for tool ${name}`;
    }

    // If custom toolSet is provided, route all calls through it
    if (config.toolSet) {
      try {
        return await config.toolSet.execute(name, input);
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Tool execution failed"}`;
      }
    }

    // Legacy path: hardcoded Trello tools + coding tools

    // Handle Trello tools
    if (name === "check_trello_item") {
      try {
        await updateCheckItem(
          config.trelloToken,
          input.cardId as string,
          input.checkItemId as string,
          "complete",
        );
        return `Marked checklist item ${input.checkItemId} as complete on card ${input.cardId}`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to update Trello"}`;
      }
    }

    if (name === "move_card_to_verify") {
      try {
        const verifyListId = await findOrCreateVerifyList(
          config.trelloToken,
          config.boardId,
        );
        await moveCard(config.trelloToken, input.cardId as string, verifyListId);
        return `Moved card ${input.cardId} to Verify list`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to move card"}`;
      }
    }

    // Handle coding tools
    try {
      return await executeTool(name, input, config.cwd);
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : "Tool execution failed"}`;
    }
  }

  const session: ProviderSession = {
    async *[Symbol.asyncIterator](): AsyncGenerator<AgentMessage> {
      const messages: ChatMessage[] = [
        { role: "system", content: config.systemPrompt },
        { role: "user", content: config.userPrompt },
      ];

      // Accumulate token usage across turns
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      yield { type: "system", content: "Session started" };

      for (let turn = 0; turn < config.maxTurns; turn++) {
        if (closed || config.abortController?.signal.aborted) break;

        let response: { content: string | null; tool_calls: ToolCall[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
        try {
          response = await config.chatCompletion(
            messages,
            allTools,
            config.abortController?.signal,
          );
        } catch (err) {
          yield {
            type: "error",
            content: err instanceof Error ? err.message : "Chat completion failed",
          };
          break;
        }

        // Accumulate token usage from this turn
        if (response.usage) {
          totalInputTokens += response.usage.prompt_tokens ?? 0;
          totalOutputTokens += response.usage.completion_tokens ?? 0;
        }

        // Yield assistant text
        if (response.content) {
          yield { type: "assistant", content: response.content };
        }

        // If no tool calls, check if the agent just started and nudge it to use tools
        if (!response.tool_calls || response.tool_calls.length === 0) {
          if (turn === 0) {
            // First turn with no tool calls — the model may need a nudge
            messages.push({
              role: "assistant",
              content: response.content,
            });
            messages.push({
              role: "user",
              content: "Please use the available tools to complete the tasks. Start by using list_files or search_files to explore the codebase, then make the necessary code changes.",
            });
            continue;
          }
          messages.push({
            role: "assistant",
            content: response.content,
          });
          break;
        }

        // Add assistant message with tool calls
        messages.push({
          role: "assistant",
          content: response.content,
          tool_calls: response.tool_calls,
        });

        // Execute each tool call
        for (const toolCall of response.tool_calls) {
          if (closed || config.abortController?.signal.aborted) break;

          yield {
            type: "tool_use",
            toolName: toolCall.function.name,
            toolInput: safeParseJson(toolCall.function.arguments),
          };

          const result = await handleToolCall(toolCall);

          yield {
            type: "tool_result",
            toolName: toolCall.function.name,
            toolResult: result,
          };

          messages.push({
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
          });
        }
      }

      yield {
        type: "done",
        usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
      };
    },
    close() {
      closed = true;
    },
  };

  return session;
}

function safeParseJson(
  json: string,
): Record<string, unknown> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
