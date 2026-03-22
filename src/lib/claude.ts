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
  } = params;

  // Filter out cards already in the done list (Trello-specific)
  const activeBoardData: BoardData = {
    ...boardData,
    cards: boardData.doneListId
      ? boardData.cards.filter((c) => c.idList !== boardData.doneListId)
      : boardData.cards,
  };

  const { systemPrompt, mcpServers, allowedTools } = buildSourceConfig(params);

  return query({
    prompt: buildUserPrompt(activeBoardData, userMessage),
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
  } = params;

  const { systemPrompt, mcpServers, allowedTools } = buildParallelSourceConfig(params);

  return query({
    prompt: buildParallelCardPrompt(card, boardName, userMessage),
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
