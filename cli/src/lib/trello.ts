const TRELLO_BASE = "https://api.trello.com/1";

interface TrelloClient {
  updateCheckItem(
    cardId: string,
    checkItemId: string,
    state: "complete" | "incomplete",
  ): Promise<void>;
  moveCard(cardId: string, listId: string): Promise<void>;
  findOrCreateDoneList(boardId: string): Promise<string>;
}

export function createTrelloClient(
  apiKey: string,
  token: string,
): TrelloClient {
  async function trelloFetch<T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    const separator = path.includes("?") ? "&" : "?";
    const url = `${TRELLO_BASE}${path}${separator}key=${apiKey}&token=${token}`;

    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...((options?.headers as Record<string, string>) ?? {}),
      },
    });

    if (!res.ok) {
      throw new Error(`Trello API error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  return {
    async updateCheckItem(cardId, checkItemId, state) {
      await trelloFetch(`/cards/${cardId}/checkItem/${checkItemId}`, {
        method: "PUT",
        body: JSON.stringify({ state }),
      });
    },

    async moveCard(cardId, listId) {
      await trelloFetch(`/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ idList: listId }),
      });
    },

    async findOrCreateDoneList(boardId) {
      const lists = await trelloFetch<Array<{ id: string; name: string }>>(
        `/boards/${boardId}/lists?fields=id,name&filter=open`,
      );
      const doneList = lists.find((l) => l.name.toLowerCase() === "done");
      if (doneList) return doneList.id;

      const created = await trelloFetch<{ id: string }>(
        `/boards/${boardId}/lists`,
        {
          method: "POST",
          body: JSON.stringify({ name: "Done" }),
        },
      );
      return created.id;
    },
  };
}
