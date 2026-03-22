import OpenAI from "openai";
import { runGenericAgent, type ChatMessage, type ToolCall, type AgentMessage } from "./generic-agent.js";
import type { ToolDefinition } from "./tools.js";
import type { BoardData, Credentials } from "../types.js";

const TRELLO_PROMPT = `You are a coding agent operating on a codebase. You have been given tasks from a Trello board.

You have tools: read_file, write_file, edit_file, bash, search_files, list_files, check_trello_item, move_card_to_done.

Work through each card and checklist item. Call check_trello_item when done with an item. Call move_card_to_done after all items on a card are complete.
Always read a file before editing. Use edit_file for targeted changes. Verify with bash.`;

const GITHUB_PROMPT = `You are a coding agent operating on a codebase. You have been given GitHub issues with task lists.

You have tools: read_file, write_file, edit_file, bash, search_files, list_files, check_github_task, close_github_issue, comment_on_issue.

Work through each issue and task item. Call check_github_task when done with a task. Call close_github_issue after all tasks on an issue are complete.
Always read a file before editing. Use edit_file for targeted changes. Verify with bash.`;

const GITLAB_PROMPT = `You are a coding agent operating on a codebase. You have been given GitLab issues with task lists.

You have tools: read_file, write_file, edit_file, bash, search_files, list_files, check_gitlab_task, close_gitlab_issue, comment_on_issue.

Work through each issue and task item. Call check_gitlab_task when done with a task. Call close_gitlab_issue after all tasks on an issue are complete.
Always read a file before editing. Use edit_file for targeted changes. Verify with bash.`;

export async function* launchOpenAISession(opts: {
  credentials: Credentials;
  boardData: BoardData;
  cwd: string;
  userMessage?: string;
  abortController?: AbortController;
  maxTurns?: number;
  source?: "trello" | "github" | "gitlab";
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabToken?: string;
  gitlabProjectId?: number;
}): AsyncGenerator<AgentMessage> {
  const client = new OpenAI({ apiKey: opts.credentials.anthropicApiKey });
  const source = opts.source ?? "trello";

  const activeBoardData: BoardData = {
    ...opts.boardData,
    cards: opts.boardData.doneListId
      ? opts.boardData.cards.filter((c) => c.idList !== opts.boardData.doneListId)
      : opts.boardData.cards,
  };

  const sourceLabel = source === "github" ? "GitHub issues" : source === "gitlab" ? "GitLab issues" : "Trello board";
  let prompt = `Here are the ${sourceLabel} with tasks to complete:\n\n${JSON.stringify(activeBoardData, null, 2)}`;
  if (opts.userMessage?.trim()) {
    prompt += `\n\nAdditional instructions from the user:\n${opts.userMessage.trim()}`;
  }

  const systemPrompt = source === "github" ? GITHUB_PROMPT : source === "gitlab" ? GITLAB_PROMPT : TRELLO_PROMPT;

  yield* runGenericAgent({
    systemPrompt,
    userPrompt: prompt,
    cwd: opts.cwd,
    maxTurns: opts.maxTurns ?? 50,
    trelloApiKey: opts.credentials.trelloApiKey,
    trelloToken: opts.credentials.trelloToken,
    boardId: opts.boardData.board.id,
    abortController: opts.abortController,
    chatCompletion: createOpenAIChatFn(client),
    source,
    githubToken: opts.githubToken,
    githubOwner: opts.githubOwner,
    githubRepo: opts.githubRepo,
    gitlabToken: opts.gitlabToken,
    gitlabProjectId: opts.gitlabProjectId,
  });
}

function createOpenAIChatFn(client: OpenAI) {
  return async (
    messages: ChatMessage[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): Promise<{ content: string | null; tool_calls: ToolCall[] }> => {
    const response = await client.chat.completions.create(
      {
        model: "gpt-4o",
        messages: messages.map((m) => {
          if (m.role === "tool") return { role: "tool" as const, content: m.content ?? "", tool_call_id: m.tool_call_id ?? "" };
          if (m.role === "assistant" && m.tool_calls) {
            return {
              role: "assistant" as const,
              content: m.content,
              tool_calls: m.tool_calls.map((tc) => ({ id: tc.id, type: "function" as const, function: { name: tc.function.name, arguments: tc.function.arguments } })),
            };
          }
          return { role: m.role as "system" | "user" | "assistant", content: m.content ?? "" };
        }),
        tools: tools.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description, parameters: t.parameters as Record<string, unknown> } })),
        temperature: 0,
      },
      { signal },
    );

    const choice = response.choices[0];
    return {
      content: choice?.message?.content ?? null,
      tool_calls: (choice?.message?.tool_calls ?? [])
        .filter((tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageToolCall & { type: "function" } => tc.type === "function")
        .map((tc) => ({ id: tc.id, type: "function" as const, function: { name: tc.function.name, arguments: tc.function.arguments } })),
    };
  };
}
