/**
 * Claude web adapter — uses the Anthropic Messages API with tool use
 * instead of the Agent SDK (which requires a local binary + filesystem).
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  createGenericAgentSession,
  type ChatMessage,
  type ToolCall,
} from "./generic-agent.js";
import type { ToolDefinition } from "./tools.js";
import type {
  ProviderAdapter,
  ProviderSession,
  ProviderSessionParams,
  ProviderCardAgentParams,
} from "./types.js";
import type { ToolSet } from "./source-tools.js";
import type { UserPromptFn } from "./index.js";

/**
 * Create a ChatCompletionFn that maps between the generic agent's
 * OpenAI-style ChatMessage[] and the Anthropic Messages API format.
 */
export function createAnthropicChatFn(
  client: Anthropic,
  model: string = "claude-sonnet-4-20250514",
) {
  return async (
    messages: ChatMessage[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): Promise<{ content: string | null; tool_calls: ToolCall[] }> => {
    // Extract system prompt from messages
    const systemMessages = messages.filter((m) => m.role === "system");
    const systemPrompt = systemMessages
      .map((m) => m.content ?? "")
      .filter(Boolean)
      .join("\n\n");

    // Convert remaining messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === "system") continue;

      if (msg.role === "user") {
        anthropicMessages.push({
          role: "user",
          content: msg.content ?? "",
        });
      } else if (msg.role === "assistant") {
        const content: Anthropic.ContentBlockParam[] = [];
        if (msg.content) {
          content.push({ type: "text", text: msg.content });
        }
        if (msg.tool_calls) {
          for (const tc of msg.tool_calls) {
            let parsedInput: Record<string, unknown> = {};
            try {
              parsedInput = JSON.parse(tc.function.arguments);
            } catch {
              // fallback to empty
            }
            content.push({
              type: "tool_use",
              id: tc.id,
              name: tc.function.name,
              input: parsedInput,
            });
          }
        }
        if (content.length > 0) {
          anthropicMessages.push({ role: "assistant", content });
        }
      } else if (msg.role === "tool") {
        anthropicMessages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: msg.tool_call_id ?? "",
              content: msg.content ?? "",
            },
          ],
        });
      }
    }

    // Convert tool definitions to Anthropic format
    const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool.InputSchema,
    }));

    const response = await client.messages.create(
      {
        model,
        max_tokens: 8192,
        system: systemPrompt || undefined,
        messages: anthropicMessages,
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      },
      { signal },
    );

    // Extract text content and tool calls from response
    let textContent: string | null = null;
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        textContent = (textContent ?? "") + block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          type: "function",
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input),
          },
        });
      }
    }

    return { content: textContent, tool_calls: toolCalls };
  };
}

/**
 * Claude Web Adapter — uses Anthropic Messages API for web/deployed environments.
 * Accepts a ToolSet to use instead of the hardcoded coding/Trello tools.
 */
export class ClaudeWebAdapter implements ProviderAdapter {
  readonly providerId = "claude" as const;

  constructor(
    private readonly systemPrompt: string,
    private readonly toolSet: ToolSet,
    private readonly userPromptFn: UserPromptFn,
  ) {}

  launchSession(params: ProviderSessionParams): ProviderSession {
    const client = new Anthropic({ apiKey: params.apiKey });

    return createGenericAgentSession({
      systemPrompt: this.systemPrompt,
      userPrompt: this.userPromptFn(params.boardData, params.userMessage),
      cwd: "", // not used in web mode
      maxTurns: 50,
      trelloToken: params.trelloToken,
      boardId: params.boardData.board.id,
      abortController: params.abortController,
      chatCompletion: createAnthropicChatFn(client),
      toolSet: this.toolSet,
    });
  }

  launchCardAgent(params: ProviderCardAgentParams): ProviderSession {
    const client = new Anthropic({ apiKey: params.apiKey });

    // Build a minimal board-like structure for the card agent prompt
    const cardAsBoardData = {
      board: { id: params.boardId, name: params.boardName },
      cards: [params.card],
    };

    return createGenericAgentSession({
      systemPrompt: this.systemPrompt,
      userPrompt: this.userPromptFn(cardAsBoardData, params.userMessage),
      cwd: "", // not used in web mode
      maxTurns: 30,
      trelloToken: params.trelloToken,
      boardId: params.boardId,
      abortController: params.abortController,
      chatCompletion: createAnthropicChatFn(client),
      toolSet: this.toolSet,
    });
  }
}
