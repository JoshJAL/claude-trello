import type { BoardData } from "#/lib/types";

export const SYSTEM_PROMPT = `You are operating on a codebase. You have been given a Trello board containing tasks.
Work through each card and checklist item in order.
For each checklist item you complete, call the check_trello_item tool with the checkItemId and cardId.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL checklist items on a card, call move_card_to_done with the cardId to move it to the Done list.
Once a card is in Done, do not interact with it again — move on to the next card.
Focus on one card at a time. Complete all its items, move it to Done, then proceed to the next.`;

export function buildUserPrompt(boardData: BoardData): string {
  return `Here is the Trello board with tasks to complete:\n\n${JSON.stringify(boardData, null, 2)}`;
}
