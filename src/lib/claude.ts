import {
  query,
  tool,
  createSdkMcpServer,
} from "@anthropic-ai/claude-agent-sdk";
import type { Query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { SYSTEM_PROMPT, buildUserPrompt } from "#/lib/prompts";
import {
  updateCheckItem,
  moveCard,
  findOrCreateDoneList,
} from "#/lib/trello";
import type { BoardData } from "#/lib/types";

export type { Query };

export interface ClaudeSessionParams {
  anthropicApiKey: string;
  trelloToken: string;
  boardData: BoardData;
  cwd: string;
  abortController?: AbortController;
}

export function launchClaudeSession(params: ClaudeSessionParams): Query {
  const { anthropicApiKey, trelloToken, boardData, cwd, abortController } =
    params;

  // Filter out cards already in the done list
  const activeBoardData: BoardData = {
    ...boardData,
    cards: boardData.doneListId
      ? boardData.cards.filter((c) => c.idList !== boardData.doneListId)
      : boardData.cards,
  };

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

  return query({
    prompt: buildUserPrompt(activeBoardData),
    options: {
      abortController,
      cwd,
      env: {
        ANTHROPIC_API_KEY: anthropicApiKey,
        CLAUDE_AGENT_SDK_CLIENT_APP: "claude-trello/0.1.0",
      },
      systemPrompt: SYSTEM_PROMPT,
      permissionMode: "acceptEdits",
      allowedTools: [
        "mcp__trello-tools__check_trello_item",
        "mcp__trello-tools__move_card_to_done",
      ],
      maxTurns: 50,
      mcpServers: {
        "trello-tools": trelloServer,
      },
      persistSession: false,
    },
  });
}
