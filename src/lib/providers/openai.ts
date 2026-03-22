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
import { buildLocalSessionConfig, buildLocalCardConfig } from "./local-config.js";

export class OpenAIAdapter implements ProviderAdapter {
  readonly providerId = "openai" as const;

  launchSession(params: ProviderSessionParams): ProviderSession {
    const client = new OpenAI({ apiKey: params.apiKey });
    const config = buildLocalSessionConfig(params);

    return createGenericAgentSession({
      ...config,
      maxTurns: 50,
      abortController: params.abortController,
      chatCompletion: createOpenAIChatFn(client),
    });
  }

  launchCardAgent(params: ProviderCardAgentParams): ProviderSession {
    const client = new OpenAI({ apiKey: params.apiKey });
    const config = buildLocalCardConfig(params);

    return createGenericAgentSession({
      ...config,
      maxTurns: 30,
      abortController: params.abortController,
      chatCompletion: createOpenAIChatFn(client),
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
