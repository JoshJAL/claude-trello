import {
  query,
  tool,
  createSdkMcpServer,
} from "@anthropic-ai/claude-agent-sdk";
import type { Query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { createTrelloClient } from "./trello.js";
import type { BoardData, Credentials } from "./types.js";

const SYSTEM_PROMPT = `You are operating on a codebase. You have been given a Trello board containing tasks.
Work through each card and checklist item in order.
For each checklist item you complete, call the check_trello_item tool with the checkItemId and cardId.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL checklist items on a card, call move_card_to_done with the cardId to move it to the Done list.
Once a card is in Done, do not interact with it again — move on to the next card.
Focus on one card at a time. Complete all its items, move it to Done, then proceed to the next.`;

function buildUserPrompt(boardData: BoardData): string {
  return `Here is the Trello board with tasks to complete:\n\n${JSON.stringify(boardData, null, 2)}`;
}

export interface RunnerOptions {
  credentials: Credentials;
  boardData: BoardData;
  cwd: string;
  abortController?: AbortController;
}

export type { Query };

export function launchSession(options: RunnerOptions): Query {
  const { credentials, boardData, cwd, abortController } = options;
  const trello = createTrelloClient(
    credentials.trelloApiKey,
    credentials.trelloToken,
  );

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
      await trello.updateCheckItem(cardId, checkItemId, "complete");
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
      const doneListId = await trello.findOrCreateDoneList(boardData.board.id);
      await trello.moveCard(cardId, doneListId);
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
        ANTHROPIC_API_KEY: credentials.anthropicApiKey,
        CLAUDE_AGENT_SDK_CLIENT_APP: "claude-trello-cli/0.1.0",
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
