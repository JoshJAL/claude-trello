/**
 * Shared config builder for local-mode OpenAI/Groq adapters.
 * Selects the right system prompt, user prompt, and tool set based on source context.
 */

import { CODING_TOOLS } from "./tools.js";
import {
  GENERIC_AGENT_SYSTEM_PROMPT,
  GENERIC_GITHUB_SYSTEM_PROMPT,
  GENERIC_GITLAB_SYSTEM_PROMPT,
} from "./prompts.js";
import {
  createGitHubSourceToolSet,
  createGitLabSourceToolSet,
  createGuardedToolSet,
} from "./source-tools.js";
import type { ToolSet } from "./source-tools.js";
import type { ProviderSessionParams, ProviderCardAgentParams } from "./types.js";
import {
  buildUserPrompt,
  buildParallelCardPrompt,
  buildGitHubUserPrompt,
  buildGitHubIssuePrompt,
  buildGitLabUserPrompt,
  buildGitLabIssuePrompt,
  type GitHubIssueWithTasks,
  type GitLabIssueWithTasks,
} from "#/lib/prompts";
import type { BoardData } from "#/lib/types";

interface LocalAgentConfig {
  systemPrompt: string;
  userPrompt: string;
  cwd: string;
  trelloToken: string;
  boardId: string;
  toolSet?: ToolSet;
}

/**
 * Build config for a full-board/repo session.
 */
export function buildLocalSessionConfig(params: ProviderSessionParams): LocalAgentConfig {
  const { boardData, cwd, userMessage, trelloToken, sourceContext } = params;
  const source = sourceContext?.source ?? "trello";

  if (source === "github" && sourceContext?.sourceToken && sourceContext.githubOwner && sourceContext.githubRepo) {
    const sourceTools = createGitHubSourceToolSet(
      sourceContext.sourceToken,
      sourceContext.githubOwner,
      sourceContext.githubRepo,
    );
    const codingToolSet = createCodingToolSet(cwd);

    return {
      systemPrompt: GENERIC_GITHUB_SYSTEM_PROMPT,
      userPrompt: buildGitHubUserPromptFromBoardData(boardData, userMessage),
      cwd,
      trelloToken: "",
      boardId: boardData.board.id,
      toolSet: createGuardedToolSet(mergeToolSets(codingToolSet, sourceTools)),
    };
  }

  if (source === "gitlab" && sourceContext?.sourceToken && sourceContext.gitlabProjectId) {
    const sourceTools = createGitLabSourceToolSet(
      sourceContext.sourceToken,
      sourceContext.gitlabProjectId,
    );
    const codingToolSet = createCodingToolSet(cwd);

    return {
      systemPrompt: GENERIC_GITLAB_SYSTEM_PROMPT,
      userPrompt: buildGitLabUserPromptFromBoardData(boardData, userMessage),
      cwd,
      trelloToken: "",
      boardId: boardData.board.id,
      toolSet: createGuardedToolSet(mergeToolSets(codingToolSet, sourceTools)),
    };
  }

  // Default: Trello (uses legacy hardcoded tools in generic-agent.ts)
  return {
    systemPrompt: GENERIC_AGENT_SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(boardData, userMessage),
    cwd,
    trelloToken,
    boardId: boardData.board.id,
  };
}

/**
 * Build config for a single-card/issue agent.
 */
export function buildLocalCardConfig(params: ProviderCardAgentParams): LocalAgentConfig {
  const { card, boardId, boardName, cwd, userMessage, trelloToken, sourceContext } = params;
  const source = sourceContext?.source ?? "trello";

  if (source === "github" && sourceContext?.sourceToken && sourceContext.githubOwner && sourceContext.githubRepo) {
    const sourceTools = createGitHubSourceToolSet(
      sourceContext.sourceToken,
      sourceContext.githubOwner,
      sourceContext.githubRepo,
    );
    const codingToolSet = createCodingToolSet(cwd);

    const issue = boardDataCardToGitHubIssue(card);
    return {
      systemPrompt: GENERIC_GITHUB_SYSTEM_PROMPT,
      userPrompt: buildGitHubIssuePrompt(
        boardName,
        issue,
        userMessage,
      ),
      cwd,
      trelloToken: "",
      boardId,
      toolSet: createGuardedToolSet(mergeToolSets(codingToolSet, sourceTools)),
    };
  }

  if (source === "gitlab" && sourceContext?.sourceToken && sourceContext.gitlabProjectId) {
    const sourceTools = createGitLabSourceToolSet(
      sourceContext.sourceToken,
      sourceContext.gitlabProjectId,
    );
    const codingToolSet = createCodingToolSet(cwd);

    const issue = boardDataCardToGitLabIssue(card);
    return {
      systemPrompt: GENERIC_GITLAB_SYSTEM_PROMPT,
      userPrompt: buildGitLabIssuePrompt(
        boardName,
        issue,
        userMessage,
      ),
      cwd,
      trelloToken: "",
      boardId,
      toolSet: createGuardedToolSet(mergeToolSets(codingToolSet, sourceTools)),
    };
  }

  // Default: Trello
  return {
    systemPrompt: GENERIC_AGENT_SYSTEM_PROMPT,
    userPrompt: buildParallelCardPrompt(card, boardName, userMessage),
    cwd,
    trelloToken,
    boardId,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

import { executeTool } from "./tools.js";

function createCodingToolSet(cwd: string): ToolSet {
  return {
    definitions: [...CODING_TOOLS],
    execute: (name: string, input: Record<string, unknown>) =>
      executeTool(name, input, cwd),
  };
}

function mergeToolSets(a: ToolSet, b: ToolSet): ToolSet {
  return {
    definitions: [...a.definitions, ...b.definitions],
    execute: async (name: string, input: Record<string, unknown>) => {
      const inA = a.definitions.some((d) => d.name === name);
      if (inA) return a.execute(name, input);
      return b.execute(name, input);
    },
  };
}

/**
 * Convert BoardData (Trello format) to GitHub user prompt.
 * Filters out completed tasks.
 */
function buildGitHubUserPromptFromBoardData(boardData: BoardData, userMessage?: string): string {
  const issues: GitHubIssueWithTasks[] = boardData.cards
    .reduce<GitHubIssueWithTasks[]>((acc, card) => {
      const tasks = (card.checklists?.[0]?.checkItems ?? [])
        .filter((item) => item.state !== "complete")
        .map((item) => ({
          index: Number(item.id.replace("task-", "")),
          text: item.name,
          checked: false,
        }));

      if (tasks.length > 0) {
        acc.push({
          number: Number(card.id),
          title: card.name,
          body: card.desc ?? "",
          state: "open" as const,
          html_url: "",
          labels: [],
          assignees: [],
          tasks,
        });
      }
      return acc;
    }, []);

  return buildGitHubUserPrompt(boardData.board.name, issues, userMessage);
}

function buildGitLabUserPromptFromBoardData(boardData: BoardData, userMessage?: string): string {
  const issues: GitLabIssueWithTasks[] = boardData.cards
    .reduce<GitLabIssueWithTasks[]>((acc, card) => {
      const tasks = (card.checklists?.[0]?.checkItems ?? [])
        .filter((item) => item.state !== "complete")
        .map((item) => ({
          index: Number(item.id.replace("task-", "")),
          text: item.name,
          checked: false,
        }));

      if (tasks.length > 0) {
        acc.push({
          iid: Number(card.id),
          id: Number(card.id),
          title: card.name,
          description: card.desc ?? "",
          state: "opened" as const,
          web_url: "",
          labels: [],
          assignees: [],
          tasks,
        });
      }
      return acc;
    }, []);

  return buildGitLabUserPrompt(boardData.board.name, issues, userMessage);
}

function boardDataCardToGitHubIssue(card: { id: string; name: string; desc?: string; checklists?: Array<{ checkItems: Array<{ id: string; name: string; state: string }> }> }): GitHubIssueWithTasks {
  const tasks = (card.checklists?.[0]?.checkItems ?? [])
    .filter((item) => item.state !== "complete")
    .map((item) => ({
      index: Number(item.id.replace("task-", "")),
      text: item.name,
      checked: false,
    }));

  return {
    number: Number(card.id),
    title: card.name,
    body: card.desc ?? "",
    state: "open",
    html_url: "",
    labels: [],
    assignees: [],
    tasks,
  };
}

function boardDataCardToGitLabIssue(card: { id: string; name: string; desc?: string; checklists?: Array<{ checkItems: Array<{ id: string; name: string; state: string }> }> }): GitLabIssueWithTasks {
  const tasks = (card.checklists?.[0]?.checkItems ?? [])
    .filter((item) => item.state !== "complete")
    .map((item) => ({
      index: Number(item.id.replace("task-", "")),
      text: item.name,
      checked: false,
    }));

  return {
    iid: Number(card.id),
    id: Number(card.id),
    title: card.name,
    description: card.desc ?? "",
    state: "opened",
    web_url: "",
    labels: [],
    assignees: [],
    tasks,
  };
}
