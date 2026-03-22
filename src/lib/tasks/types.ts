export type TaskSource = "trello" | "github" | "gitlab";

export interface TaskBoard {
  source: TaskSource;
  id: string; // Trello board ID, or "owner/repo" for GitHub/GitLab
  name: string;
  description: string;
  url: string;
}

export interface TaskCard {
  source: TaskSource;
  id: string; // Trello card ID, or issue number as string
  name: string;
  description: string;
  listId?: string; // Trello list ID (not applicable for GitHub/GitLab)
  position?: number;
  checklists: TaskChecklist[];
  sourceIds: {
    // Trello
    cardId?: string;
    // GitHub/GitLab
    owner?: string;
    repo?: string;
    issueNumber?: number;
  };
}

export interface TaskChecklist {
  id: string;
  name: string;
  items: TaskCheckItem[];
}

export interface TaskCheckItem {
  id: string; // Trello checkItemId, or "task-{index}" for GH/GL
  name: string;
  state: "complete" | "incomplete";
  position: number;
  sourceIds: {
    checkItemId?: string; // Trello
    taskIndex?: number; // GitHub/GitLab markdown task index
  };
}

export interface TaskBoardData {
  source: TaskSource;
  board: { id: string; name: string };
  cards: TaskCard[];
  doneListId?: string; // Trello-specific
}
