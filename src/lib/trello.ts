import type {
  TrelloBoard,
  TrelloCard,
  TrelloChecklist,
  TrelloList,
} from "#/lib/types";

const TRELLO_BASE = "https://api.trello.com/1";

async function trelloFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${TRELLO_BASE}${path}${separator}key=${process.env.TRELLO_API_KEY!}&token=${token}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trello API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function getBoards(token: string): Promise<TrelloBoard[]> {
  return trelloFetch<TrelloBoard[]>(
    "/members/me/boards?fields=id,name,desc,url,closed&filter=open",
    token,
  );
}

export async function getCards(
  token: string,
  boardId: string,
): Promise<TrelloCard[]> {
  const cards = await trelloFetch<
    Array<Omit<TrelloCard, "checklists"> & { idChecklists: string[] }>
  >(
    `/boards/${boardId}/cards?fields=id,name,desc,idList,pos,idChecklists`,
    token,
  );

  // Fetch checklists for cards that have them
  const cardsWithChecklists: TrelloCard[] = await Promise.all(
    cards.map(async (card) => {
      let checklists: TrelloChecklist[] = [];
      if (card.idChecklists.length > 0) {
        checklists = await trelloFetch<TrelloChecklist[]>(
          `/cards/${card.id}/checklists?fields=id,name&checkItem_fields=id,name,state,pos`,
          token,
        );
      }
      return {
        id: card.id,
        name: card.name,
        desc: card.desc,
        idList: card.idList,
        pos: card.pos,
        checklists,
      };
    }),
  );

  return cardsWithChecklists;
}

export async function getLists(
  token: string,
  boardId: string,
): Promise<TrelloList[]> {
  return trelloFetch<TrelloList[]>(
    `/boards/${boardId}/lists?fields=id,name,pos&filter=open`,
    token,
  );
}

export async function moveCard(
  token: string,
  cardId: string,
  listId: string,
): Promise<void> {
  await trelloFetch(`/cards/${cardId}`, token, {
    method: "PUT",
    body: JSON.stringify({ idList: listId }),
  });
}

export async function findOrCreateDoneList(
  token: string,
  boardId: string,
): Promise<string> {
  const lists = await getLists(token, boardId);
  // Look for an existing "Done" list (case-insensitive)
  const doneList = lists.find(
    (l) => l.name.toLowerCase() === "done",
  );
  if (doneList) return doneList.id;

  // Create one at the end
  const created = await trelloFetch<{ id: string }>(
    `/boards/${boardId}/lists`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ name: "Done" }),
    },
  );
  return created.id;
}

export async function updateCheckItem(
  token: string,
  cardId: string,
  checkItemId: string,
  state: "complete" | "incomplete",
): Promise<void> {
  await trelloFetch(
    `/cards/${cardId}/checkItem/${checkItemId}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify({ state }),
    },
  );
}
