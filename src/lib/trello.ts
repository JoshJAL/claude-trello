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
    // Do not include response body — it may contain tokens in error details
    throw new Error(`Trello API error: ${res.status} ${res.statusText}`);
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

export async function findOrCreateVerifyList(
  token: string,
  boardId: string,
): Promise<string> {
  const lists = await getLists(token, boardId);
  // Look for an existing "Verify" list (case-insensitive)
  const verifyList = lists.find(
    (l) => l.name.toLowerCase() === "verify",
  );
  if (verifyList) return verifyList.id;

  // Look for "Done" list to position "Verify" before it
  const doneList = lists.find(
    (l) => l.name.toLowerCase() === "done",
  );
  
  // Create Verify list, positioning it before Done if it exists
  const createParams: { name: string; pos?: string } = { name: "Verify" };
  if (doneList) {
    createParams.pos = "top";
    // First create the list, then we'll position it correctly
  }

  const created = await trelloFetch<{ id: string }>(
    `/boards/${boardId}/lists`,
    token,
    {
      method: "POST",
      body: JSON.stringify(createParams),
    },
  );

  // If we found a Done list, move Verify to be just before it
  if (doneList) {
    const updatedLists = await getLists(token, boardId);
    const doneIndex = updatedLists.findIndex(l => l.id === doneList.id);
    if (doneIndex > 0) {
      // Position Verify just before Done
      await trelloFetch(`/lists/${created.id}`, token, {
        method: "PUT",
        body: JSON.stringify({ pos: doneIndex - 0.5 }),
      });
    }
  }

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
