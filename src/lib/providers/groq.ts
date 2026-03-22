import Groq from "groq-sdk";
import {
  createGenericAgentSession,
  type ChatMessage,
  type ToolCall,
} from "./generic-agent.js";
import type { ToolDefinition } from "./tools.js";
import { buildUserPrompt, buildParallelCardPrompt } from "#/lib/prompts";
import { GENERIC_AGENT_SYSTEM_PROMPT } from "./prompts.js";
import type {
  ProviderAdapter,
  ProviderSession,
  ProviderSessionParams,
  ProviderCardAgentParams,
} from "./types.js";

export class GroqAdapter implements ProviderAdapter {
  readonly providerId = "groq" as const;

  launchSession(params: ProviderSessionParams): ProviderSession {
    const client = new Groq({ apiKey: params.apiKey });

    return createGenericAgentSession({
      systemPrompt: GENERIC_AGENT_SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(params.boardData, params.userMessage),
      cwd: params.cwd,
      maxTurns: 50,
      trelloToken: params.trelloToken,
      boardId: params.boardData.board.id,
      abortController: params.abortController,
      chatCompletion: createGroqChatFn(client),
    });
  }

  launchCardAgent(params: ProviderCardAgentParams): ProviderSession {
    const client = new Groq({ apiKey: params.apiKey });

    return createGenericAgentSession({
      systemPrompt: GENERIC_AGENT_SYSTEM_PROMPT,
      userPrompt: buildParallelCardPrompt(
        params.card,
        params.boardName,
        params.userMessage,
      ),
      cwd: params.cwd,
      maxTurns: 30,
      trelloToken: params.trelloToken,
      boardId: params.boardId,
      abortController: params.abortController,
      chatCompletion: createGroqChatFn(client),
    });
  }
}

function createGroqChatFn(client: Groq) {
  return async (
    messages: ChatMessage[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): Promise<{ content: string | null; tool_calls: ToolCall[] }> => {
    const groqMessages = messages.map(
      (m): Groq.Chat.Completions.ChatCompletionMessageParam => {
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

    const groqTools: Groq.Chat.Completions.ChatCompletionTool[] = tools.map(
      (t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters as Record<string, unknown>,
        },
      }),
    );

    const response = await client.chat.completions.create(
      {
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        tools: groqTools,
        temperature: 0,
      },
      { signal },
    );

    const choice = response.choices[0];
    const content = choice?.message?.content ?? null;
    const toolCalls: ToolCall[] = (choice?.message?.tool_calls ?? []).map(
      (tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }),
    );

    return { content, tool_calls: toolCalls };
  };
}
