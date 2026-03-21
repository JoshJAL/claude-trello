export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  url: string;
  closed: boolean;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList: string;
  pos: number;
  checklists: TrelloChecklist[];
}

export interface TrelloChecklist {
  id: string;
  name: string;
  checkItems: TrelloCheckItem[];
}

export interface TrelloCheckItem {
  id: string;
  name: string;
  state: "complete" | "incomplete";
  pos: number;
}

export interface TrelloList {
  id: string;
  name: string;
  pos: number;
}

export interface BoardData {
  board: { id: string; name: string };
  cards: TrelloCard[];
  doneListId?: string;
}

export interface Credentials {
  trelloApiKey: string;
  trelloToken: string;
  anthropicApiKey: string;
}

export interface IntegrationStatus {
  trelloLinked: boolean;
  hasApiKey: boolean;
}

export interface CardsResponse {
  cards: TrelloCard[];
  lists: TrelloList[];
  doneListId: string | null;
}
