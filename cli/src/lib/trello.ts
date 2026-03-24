const TRELLO_BASE = "https://api.trello.com/1";

interface TrelloClient {
  updateCheckItem(
    cardId: string,
    checkItemId: string,
    state: "complete" | "incomplete",
  ): Promise<void>;
  moveCard(cardId: string, listId: string): Promise<void>;
  findOrCreateVerifyList(boardId: string): Promise<string>;
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

    async findOrCreateVerifyList(boardId) {
      const lists = await trelloFetch<Array<{ id: string; name: string; pos: number }>>(
        `/boards/${boardId}/lists?fields=id,name,pos&filter=open`,
      );
      const verifyList = lists.find((l) => l.name.toLowerCase() === "verify");
      if (verifyList) return verifyList.id;

      // Look for "Done" list to position "Verify" before it
      const doneList = lists.find((l) => l.name.toLowerCase() === "done");
      
      // Create Verify list, positioning it before Done if it exists
      const createParams: { name: string; pos?: string } = { name: "Verify" };
      if (doneList) {
        createParams.pos = "top";
      }

      const created = await trelloFetch<{ id: string }>(
        `/boards/${boardId}/lists`,
        {
          method: "POST",
          body: JSON.stringify(createParams),
        },
      );

      // If we found a Done list, move Verify to be just before it
      if (doneList) {
        const updatedLists = await trelloFetch<Array<{ id: string; name: string; pos: number }>>(
          `/boards/${boardId}/lists?fields=id,name,pos&filter=open`,
        );
        const doneIndex = updatedLists.findIndex(l => l.id === doneList.id);
        if (doneIndex > 0) {
          // Position Verify just before Done
          await trelloFetch(`/lists/${created.id}`, {
            method: "PUT",
            body: JSON.stringify({ pos: doneIndex - 0.5 }),
          });
        }
      }

      return created.id;
    },
  };
}
