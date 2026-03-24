import {
  query,
  tool,
  createSdkMcpServer,
} from "@anthropic-ai/claude-agent-sdk";
import type { Query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import {
  SYSTEM_PROMPT,
  PARALLEL_AGENT_SYSTEM_PROMPT,
  GITHUB_SYSTEM_PROMPT,
  GITHUB_PARALLEL_SYSTEM_PROMPT,
  GITLAB_SYSTEM_PROMPT,
  GITLAB_PARALLEL_SYSTEM_PROMPT,
  buildUserPrompt,
  buildParallelCardPrompt,
  buildGitHubUserPrompt,
  buildGitHubIssuePrompt,
  buildGitLabUserPrompt,
  buildGitLabIssuePrompt,
  type GitHubIssueWithTasks,
  type GitLabIssueWithTasks,
} from "#/lib/prompts";
import {
  updateCheckItem,
  moveCard,
  findOrCreateDoneList,
} from "#/lib/trello";
import { createGitHubMcpTools } from "#/lib/github/tools";
import { createGitLabMcpTools } from "#/lib/gitlab/tools";
import type { BoardData, TrelloCard } from "#/lib/types";

export type { Query };

export interface ClaudeSessionParams {
  anthropicApiKey: string;
  trelloToken: string;
  boardData: BoardData;
  cwd: string;
  userMessage?: string;
  abortController?: AbortController;
  source?: "trello" | "github" | "gitlab";
  sourceToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabProjectId?: number;
}

export interface CardAgentParams {
  anthropicApiKey: string;
  trelloToken: string;
  card: TrelloCard;
  boardId: string;
  boardName: string;
  cwd: string;
  userMessage?: string;
  abortController?: AbortController;
  source?: "trello" | "github" | "gitlab";
  sourceToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabProjectId?: number;
}

function buildSourceConfig(params: {
  source?: string;
  sourceToken?: string;
  trelloToken: string;
  boardData: BoardData;
  githubOwner?: string;
  githubRepo?: string;
  gitlabProjectId?: number;
}): {
  systemPrompt: string;
  mcpServers: Record<string, ReturnType<typeof createSdkMcpServer>>;
  allowedTools: string[];
} {
  const { source, sourceToken, trelloToken, boardData, githubOwner, githubRepo, gitlabProjectId } = params;

  if (source === "github" && sourceToken && githubOwner && githubRepo) {
    const { server, allowedTools } = createGitHubMcpTools(sourceToken, githubOwner, githubRepo);
    return {
      systemPrompt: GITHUB_SYSTEM_PROMPT,
      mcpServers: { "github-tools": server },
      allowedTools,
    };
  }

  if (source === "gitlab" && sourceToken && gitlabProjectId) {
    const { server, allowedTools } = createGitLabMcpTools(sourceToken, gitlabProjectId);
    return {
      systemPrompt: GITLAB_SYSTEM_PROMPT,
      mcpServers: { "gitlab-tools": server },
      allowedTools,
    };
  }

  // Default: Trello
  const checkTrelloItem = tool(
    "check_trello_item",
    "Mark a Trello checklist item as complete once the corresponding code task is done.",
    {
      checkItemId: z.string().describe("The Trello checklist item ID"),
      cardId: z.string().describe("The Trello card ID"),
    },
    async ({ checkItemId, cardId }) => {
      await updateCheckItem(trelloToken, cardId, checkItemId, "complete");
      return {
        content: [
          {
            type: "text" as const,
            text: `Marked checklist item ${checkItemId} as complete on card ${cardId}`,
          },
        ],
      };
    },
  );

  const moveCardToDone = tool(
    "move_card_to_done",
    "Move a Trello card to the Done list after all its checklist items are completed. Call this after you have checked off every item on the card.",
    {
      cardId: z.string().describe("The Trello card ID to move to Done"),
    },
    async ({ cardId }) => {
      const doneListId = await findOrCreateDoneList(
        trelloToken,
        boardData.board.id,
      );
      await moveCard(trelloToken, cardId, doneListId);
      return {
        content: [
          {
            type: "text" as const,
            text: `Moved card ${cardId} to Done list`,
          },
        ],
      };
    },
  );

  const trelloServer = createSdkMcpServer({
    name: "trello-tools",
    tools: [checkTrelloItem, moveCardToDone],
  });

  return {
    systemPrompt: SYSTEM_PROMPT,
    mcpServers: { "trello-tools": trelloServer },
    allowedTools: [
      "mcp__trello-tools__check_trello_item",
      "mcp__trello-tools__move_card_to_done",
    ],
  };
}

function buildParallelSourceConfig(params: {
  source?: string;
  sourceToken?: string;
  trelloToken: string;
  boardId: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabProjectId?: number;
}): {
  systemPrompt: string;
  mcpServers: Record<string, ReturnType<typeof createSdkMcpServer>>;
  allowedTools: string[];
} {
  const { source, sourceToken, trelloToken, boardId, githubOwner, githubRepo, gitlabProjectId } = params;

  if (source === "github" && sourceToken && githubOwner && githubRepo) {
    const { server, allowedTools } = createGitHubMcpTools(sourceToken, githubOwner, githubRepo);
    return {
      systemPrompt: GITHUB_PARALLEL_SYSTEM_PROMPT,
      mcpServers: { "github-tools": server },
      allowedTools,
    };
  }

  if (source === "gitlab" && sourceToken && gitlabProjectId) {
    const { server, allowedTools } = createGitLabMcpTools(sourceToken, gitlabProjectId);
    return {
      systemPrompt: GITLAB_PARALLEL_SYSTEM_PROMPT,
      mcpServers: { "gitlab-tools": server },
      allowedTools,
    };
  }

  // Default: Trello
  const checkTrelloItem = tool(
    "check_trello_item",
    "Mark a Trello checklist item as complete once the corresponding code task is done.",
    {
      checkItemId: z.string().describe("The Trello checklist item ID"),
      cardId: z.string().describe("The Trello card ID"),
    },
    async ({ checkItemId, cardId }) => {
      await updateCheckItem(trelloToken, cardId, checkItemId, "complete");
      return {
        content: [
          {
            type: "text" as const,
            text: `Marked checklist item ${checkItemId} as complete on card ${cardId}`,
          },
        ],
      };
    },
  );

  const moveCardToDone = tool(
    "move_card_to_done",
    "Move a Trello card to the Done list after all its checklist items are completed.",
    {
      cardId: z.string().describe("The Trello card ID to move to Done"),
    },
    async ({ cardId }) => {
      const doneListId = await findOrCreateDoneList(trelloToken, boardId);
      await moveCard(trelloToken, cardId, doneListId);
      return {
        content: [
          {
            type: "text" as const,
            text: `Moved card ${cardId} to Done list`,
          },
        ],
      };
    },
  );

  const trelloServer = createSdkMcpServer({
    name: "trello-tools",
    tools: [checkTrelloItem, moveCardToDone],
  });

  return {
    systemPrompt: PARALLEL_AGENT_SYSTEM_PROMPT,
    mcpServers: { "trello-tools": trelloServer },
    allowedTools: [
      "mcp__trello-tools__check_trello_item",
      "mcp__trello-tools__move_card_to_done",
    ],
  };
}

export function launchClaudeSession(params: ClaudeSessionParams): Query {
  const {
    anthropicApiKey,
    boardData,
    cwd,
    userMessage,
    abortController,
    source,
    githubOwner,
    githubRepo,
  } = params;

  // Filter out cards already in the done list (Trello-specific)
  const activeBoardData: BoardData = {
    ...boardData,
    cards: boardData.doneListId
      ? boardData.cards.filter((c) => c.idList !== boardData.doneListId)
      : boardData.cards,
  };

  const { systemPrompt, mcpServers, allowedTools } = buildSourceConfig(params);

  // Build the correct user prompt based on source
  let userPrompt: string;
  if (source === "github" && githubOwner && githubRepo) {
    userPrompt = buildGitHubUserPromptFromCards(activeBoardData, userMessage);
  } else if (source === "gitlab") {
    userPrompt = buildGitLabUserPromptFromCards(activeBoardData, userMessage);
  } else {
    userPrompt = buildUserPrompt(activeBoardData, userMessage);
  }

  return query({
    prompt: userPrompt,
    options: {
      abortController,
      cwd,
      env: {
        ANTHROPIC_API_KEY: anthropicApiKey,
        CLAUDE_AGENT_SDK_CLIENT_APP: "taskpilot/0.1.0",
      },
      systemPrompt,
      permissionMode: "acceptEdits",
      allowedTools,
      maxTurns: 50,
      mcpServers,
      persistSession: false,
    },
  });
}

/**
 * Launch a single-card agent in an isolated worktree for parallel mode.
 */
export function launchCardAgent(params: CardAgentParams): Query {
  const {
    anthropicApiKey,
    card,
    boardName,
    cwd,
    userMessage,
    abortController,
    source,
    githubOwner,
    githubRepo,
  } = params;

  const { systemPrompt, mcpServers, allowedTools } = buildParallelSourceConfig(params);

  // Build the correct card/issue prompt based on source
  let cardPrompt: string;
  if (source === "github" && githubOwner && githubRepo) {
    const issue = cardToGitHubIssue(card);
    cardPrompt = buildGitHubIssuePrompt(`${githubOwner}/${githubRepo}`, issue, userMessage);
  } else if (source === "gitlab") {
    const issue = cardToGitLabIssue(card);
    cardPrompt = buildGitLabIssuePrompt(boardName, issue, userMessage);
  } else {
    cardPrompt = buildParallelCardPrompt(card, boardName, userMessage);
  }

  return query({
    prompt: cardPrompt,
    options: {
      abortController,
      cwd,
      env: {
        ANTHROPIC_API_KEY: anthropicApiKey,
        CLAUDE_AGENT_SDK_CLIENT_APP: "taskpilot/0.1.0",
      },
      systemPrompt,
      permissionMode: "acceptEdits",
      allowedTools,
      maxTurns: 30,
      mcpServers,
      persistSession: false,
    },
  });
}

// ── Helpers: Convert BoardData cards to source-specific issue format ────────

function buildGitHubUserPromptFromCards(boardData: BoardData, userMessage?: string): string {
  const issues: GitHubIssueWithTasks[] = boardData.cards.map((card) => {
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
      state: "open" as const,
      html_url: "",
      labels: [],
      assignees: [],
      tasks,
    };
  });

  return buildGitHubUserPrompt(boardData.board.name, issues, userMessage);
}

function buildGitLabUserPromptFromCards(boardData: BoardData, userMessage?: string): string {
  const issues: GitLabIssueWithTasks[] = boardData.cards.map((card) => {
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
      state: "opened" as const,
      web_url: "",
      labels: [],
      assignees: [],
      tasks,
    };
  });

  return buildGitLabUserPrompt(boardData.board.name, issues, userMessage);
}

function cardToGitHubIssue(card: TrelloCard): GitHubIssueWithTasks {
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

function cardToGitLabIssue(card: TrelloCard): GitLabIssueWithTasks {
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
