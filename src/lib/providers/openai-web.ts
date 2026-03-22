/**
 * OpenAI web adapter — uses the generic agent loop with a configurable tool set.
 */

import OpenAI from "openai";
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

export class OpenAIWebAdapter implements ProviderAdapter {
  readonly providerId = "openai" as const;

  constructor(
    private readonly systemPrompt: string,
    private readonly toolSet: ToolSet,
    private readonly userPromptFn: UserPromptFn,
  ) {}

  launchSession(params: ProviderSessionParams): ProviderSession {
    const client = new OpenAI({ apiKey: params.apiKey });

    return createGenericAgentSession({
      systemPrompt: this.systemPrompt,
      userPrompt: this.userPromptFn(params.boardData, params.userMessage),
      cwd: "",
      maxTurns: 50,
      trelloToken: params.trelloToken,
      boardId: params.boardData.board.id,
      abortController: params.abortController,
      chatCompletion: createOpenAIChatFn(client),
      toolSet: this.toolSet,
    });
  }

  launchCardAgent(params: ProviderCardAgentParams): ProviderSession {
    const client = new OpenAI({ apiKey: params.apiKey });

    return createGenericAgentSession({
      systemPrompt: this.systemPrompt,
      userPrompt: this.userPromptFn(
        {
          board: { id: params.boardId, name: params.boardName },
          cards: [params.card],
        },
        params.userMessage,
      ),
      cwd: "",
      maxTurns: 30,
      trelloToken: params.trelloToken,
      boardId: params.boardId,
      abortController: params.abortController,
      chatCompletion: createOpenAIChatFn(client),
      toolSet: this.toolSet,
    });
  }
}

function createOpenAIChatFn(client: OpenAI) {
  return async (
    messages: ChatMessage[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): Promise<{ content: string | null; tool_calls: ToolCall[] }> => {
    const openaiMessages = messages.map(
      (m): OpenAI.Chat.Completions.ChatCompletionMessageParam => {
        if (m.role === "tool") {
          return {
            role: "tool",
            content: m.content ?? "",
            tool_call_id: m.tool_call_id ?? "",
          };
        }
        if (m.role === "assistant" && m.tool_calls) {
          return {
            role: "assistant",
            content: m.content,
            tool_calls: m.tool_calls.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments,
              },
            })),
          };
        }
        return {
          role: m.role as "system" | "user" | "assistant",
          content: m.content ?? "",
        };
      },
    );

    const openaiTools: OpenAI.Chat.Completions.ChatCompletionTool[] =
      tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters as Record<string, unknown>,
        },
      }));

    const response = await client.chat.completions.create(
      {
        model: "gpt-4o",
        messages: openaiMessages,
        tools: openaiTools,
        temperature: 0,
      },
      { signal },
    );

    const choice = response.choices[0];
    const content = choice?.message?.content ?? null;
    const toolCalls: ToolCall[] = (choice?.message?.tool_calls ?? [])
      .filter(
        (tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageToolCall & { type: "function" } =>
          tc.type === "function",
      )
      .map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }));

    return { content, tool_calls: toolCalls };
  };
}
