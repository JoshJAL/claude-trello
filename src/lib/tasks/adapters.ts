import type {
  TaskBoard,
  TaskCard,
  TaskChecklist,
  TaskCheckItem,
  TaskBoardData,
} from "./types";
import type {
  TrelloBoard,
  TrelloCard,
  TrelloChecklist,
  TrelloCheckItem,
  BoardData,
} from "#/lib/types";

// ── Trello adapters ──────────────────────────────────────────────────────────

export function trelloBoardToTaskBoard(board: TrelloBoard): TaskBoard {
  return {
    source: "trello",
    id: board.id,
    name: board.name,
    description: board.desc,
    url: board.url,
  };
}

function trelloCheckItemToTaskCheckItem(
  item: TrelloCheckItem,
): TaskCheckItem {
  return {
    id: item.id,
    name: item.name,
    state: (item.state === "complete" || item.state === "incomplete") ? item.state : "incomplete",
    position: item.pos ?? 0,
    sourceIds: { checkItemId: item.id },
  };
}

function trelloChecklistToTaskChecklist(
  checklist: TrelloChecklist,
): TaskChecklist {
  return {
    id: checklist.id,
    name: checklist.name,
    items: checklist.checkItems.map(trelloCheckItemToTaskCheckItem),
  };
}

export function trelloCardToTaskCard(card: TrelloCard): TaskCard {
  return {
    source: "trello",
    id: card.id,
    name: card.name,
    description: card.desc,
    listId: card.idList,
    position: card.pos,
    checklists: card.checklists.map(trelloChecklistToTaskChecklist),
    sourceIds: { cardId: card.id },
  };
}

export function trelloBoardDataToTaskBoardData(
  data: BoardData,
): TaskBoardData {
  return {
    source: "trello",
    board: data.board,
    cards: data.cards.map(trelloCardToTaskCard),
    doneListId: data.doneListId,
  };
}
