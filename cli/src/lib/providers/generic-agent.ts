import { CODING_TOOLS, executeTool } from "./tools.js";
import type { ToolDefinition } from "./tools.js";
import { createTrelloClient } from "../trello.js";
import * as github from "../github.js";
import * as gitlab from "../gitlab.js";

export interface AgentMessage {
  type: "system" | "assistant" | "tool_use" | "tool_result" | "error" | "done";
  content?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
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
) => Promise<{ content: string | null; tool_calls: ToolCall[] }>;

export interface GenericAgentConfig {
  systemPrompt: string;
  userPrompt: string;
  cwd: string;
  maxTurns: number;
  trelloApiKey: string;
  trelloToken: string;
  boardId: string;
  abortController?: AbortController;
  chatCompletion: ChatCompletionFn;
  source?: "trello" | "github" | "gitlab";
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabToken?: string;
  gitlabProjectId?: number;
}

function getSourceTools(config: GenericAgentConfig): ToolDefinition[] {
  if (config.source === "github") {
    return [
      {
        name: "check_github_task",
        description: "Mark a task list item in a GitHub issue as complete.",
        parameters: {
          type: "object",
          properties: {
            issueNumber: { type: "number" },
            taskIndex: { type: "number" },
          },
          required: ["issueNumber", "taskIndex"],
        },
      },
      {
        name: "close_github_issue",
        description: "Close a GitHub issue after all tasks are done.",
        parameters: {
          type: "object",
          properties: { issueNumber: { type: "number" } },
          required: ["issueNumber"],
        },
      },
      {
        name: "comment_on_issue",
        description: "Add a comment to a GitHub issue.",
        parameters: {
          type: "object",
          properties: {
            issueNumber: { type: "number" },
            body: { type: "string" },
          },
          required: ["issueNumber", "body"],
        },
      },
    ];
  }

  if (config.source === "gitlab") {
    return [
      {
        name: "check_gitlab_task",
        description: "Mark a task list item in a GitLab issue as complete.",
        parameters: {
          type: "object",
          properties: {
            issueIid: { type: "number" },
            taskIndex: { type: "number" },
          },
          required: ["issueIid", "taskIndex"],
        },
      },
      {
        name: "close_gitlab_issue",
        description: "Close a GitLab issue after all tasks are done.",
        parameters: {
          type: "object",
          properties: { issueIid: { type: "number" } },
          required: ["issueIid"],
        },
      },
      {
        name: "comment_on_issue",
        description: "Add a note to a GitLab issue.",
        parameters: {
          type: "object",
          properties: {
            issueIid: { type: "number" },
            body: { type: "string" },
          },
          required: ["issueIid", "body"],
        },
      },
    ];
  }

  // Default: Trello
  return [
    {
      name: "check_trello_item",
      description: "Mark a Trello checklist item as complete.",
      parameters: {
        type: "object",
        properties: {
          checkItemId: { type: "string" },
          cardId: { type: "string" },
        },
        required: ["checkItemId", "cardId"],
      },
    },
    {
      name: "move_card_to_done",
      description: "Move a Trello card to the Done list.",
      parameters: {
        type: "object",
        properties: { cardId: { type: "string" } },
        required: ["cardId"],
      },
    },
  ];
}

async function executeSourceTool(
  name: string,
  input: Record<string, unknown>,
  config: GenericAgentConfig,
): Promise<string | null> {
  // GitHub tools
  if (name === "check_github_task" && config.githubToken && config.githubOwner && config.githubRepo) {
    const issues = await github.getIssues(config.githubToken, config.githubOwner, config.githubRepo);
    const issue = issues.find((i) => i.number === (input.issueNumber as number));
    if (!issue?.body) return "Issue not found or has no body";
    const updated = github.toggleTaskItem(issue.body, input.taskIndex as number, true);
    await github.updateIssueBody(config.githubToken, config.githubOwner, config.githubRepo, input.issueNumber as number, updated);
    return "Checked task";
  }
  if (name === "close_github_issue" && config.githubToken && config.githubOwner && config.githubRepo) {
    await github.closeIssue(config.githubToken, config.githubOwner, config.githubRepo, input.issueNumber as number);
    return "Closed issue";
  }
  if (name === "comment_on_issue" && config.source === "github" && config.githubToken && config.githubOwner && config.githubRepo) {
    await github.updateIssueBody(config.githubToken, config.githubOwner, config.githubRepo, input.issueNumber as number, input.body as string);
    return "Commented on issue";
  }

  // GitLab tools
  if (name === "check_gitlab_task" && config.gitlabToken && config.gitlabProjectId) {
    const issue = await gitlab.getIssue(config.gitlabToken, config.gitlabProjectId, input.issueIid as number);
    if (!issue.description) return "Issue has no description";
    const updated = gitlab.toggleTaskItem(issue.description, input.taskIndex as number, true);
    await gitlab.updateIssueDescription(config.gitlabToken, config.gitlabProjectId, input.issueIid as number, updated);
    return "Checked task";
  }
  if (name === "close_gitlab_issue" && config.gitlabToken && config.gitlabProjectId) {
    await gitlab.closeIssue(config.gitlabToken, config.gitlabProjectId, input.issueIid as number);
    return "Closed issue";
  }
  if (name === "comment_on_issue" && config.source === "gitlab" && config.gitlabToken && config.gitlabProjectId) {
    await gitlab.addNote(config.gitlabToken, config.gitlabProjectId, input.issueIid as number, input.body as string);
    return "Commented on issue";
  }

  // Trello tools
  if (name === "check_trello_item") {
    const trello = createTrelloClient(config.trelloApiKey, config.trelloToken);
    await trello.updateCheckItem(input.cardId as string, input.checkItemId as string, "complete");
    return "Marked item complete";
  }
  if (name === "move_card_to_done") {
    const trello = createTrelloClient(config.trelloApiKey, config.trelloToken);
    const doneListId = await trello.findOrCreateDoneList(config.boardId);
    await trello.moveCard(input.cardId as string, doneListId);
    return "Moved card to Done";
  }

  return null; // Not a source tool
}

export async function* runGenericAgent(
  config: GenericAgentConfig,
): AsyncGenerator<AgentMessage> {
  const allTools: ToolDefinition[] = [
    ...CODING_TOOLS,
    ...getSourceTools(config),
  ];

  const messages: ChatMessage[] = [
    { role: "system", content: config.systemPrompt },
    { role: "user", content: config.userPrompt },
  ];

  yield { type: "system", content: "Session started" };

  for (let turn = 0; turn < config.maxTurns; turn++) {
    if (config.abortController?.signal.aborted) break;

    let response: { content: string | null; tool_calls: ToolCall[] };
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

    if (response.content) {
      yield { type: "assistant", content: response.content };
    }

    if (!response.tool_calls || response.tool_calls.length === 0) {
      messages.push({ role: "assistant", content: response.content });
      break;
    }

    messages.push({
      role: "assistant",
      content: response.content,
      tool_calls: response.tool_calls,
    });

    for (const toolCall of response.tool_calls) {
      if (config.abortController?.signal.aborted) break;

      const name = toolCall.function.name;
      let input: Record<string, unknown>;
      try {
        input = JSON.parse(toolCall.function.arguments);
      } catch {
        input = {};
      }

      yield { type: "tool_use", toolName: name, toolInput: input };

      let result: string;
      const sourceResult = await executeSourceTool(name, input, config).catch(
        (err) => `Error: ${err instanceof Error ? err.message : "Failed"}`,
      );

      if (sourceResult !== null) {
        result = sourceResult;
      } else {
        result = await executeTool(name, input, config.cwd);
      }

      yield { type: "tool_result", toolName: name, content: result };
      messages.push({ role: "tool", content: result, tool_call_id: toolCall.id });
    }
  }

  yield { type: "done" };
}
