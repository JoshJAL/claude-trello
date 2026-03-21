import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TrelloBoard, TrelloCard, TrelloList } from "#/lib/types";

interface CardsResponse {
  cards: TrelloCard[];
  lists: TrelloList[];
  doneListId: string | null;
}

async function fetchBoards(): Promise<TrelloBoard[]> {
  const res = await fetch("/api/trello/boards");
  if (!res.ok) throw new Error("Failed to fetch boards");
  return res.json();
}

async function fetchCards(boardId: string): Promise<CardsResponse> {
  const res = await fetch(`/api/trello/cards?boardId=${boardId}`);
  if (!res.ok) throw new Error("Failed to fetch cards");
  return res.json();
}

export function useBoards() {
  return useQuery({
    queryKey: ["trello", "boards"],
    queryFn: fetchBoards,
  });
}

export function useBoardData(boardId: string | null, polling: boolean = false) {
  return useQuery({
    queryKey: ["trello", "cards", boardId],
    queryFn: () => fetchCards(boardId!),
    enabled: !!boardId,
    refetchInterval: polling ? 5000 : false,
  });
}

export function useCheckItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cardId,
      checkItemId,
      state,
    }: {
      cardId: string;
      checkItemId: string;
      state: "complete" | "incomplete";
      boardId: string;
    }) => {
      const res = await fetch("/api/trello/checklist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, checkItemId, state }),
      });
      if (!res.ok) throw new Error("Failed to update checklist item");
      return res.json();
    },
    onMutate: async ({ cardId, checkItemId, state, boardId }) => {
      await queryClient.cancelQueries({
        queryKey: ["trello", "cards", boardId],
      });

      const previous = queryClient.getQueryData<CardsResponse>([
        "trello",
        "cards",
        boardId,
      ]);

      queryClient.setQueryData<CardsResponse>(
        ["trello", "cards", boardId],
        (old) =>
          old
            ? {
                ...old,
                cards: old.cards.map((card) =>
                  card.id === cardId
                    ? {
                        ...card,
                        checklists: card.checklists.map((cl) => ({
                          ...cl,
                          checkItems: cl.checkItems.map((item) =>
                            item.id === checkItemId
                              ? { ...item, state }
                              : item,
                          ),
                        })),
                      }
                    : card,
                ),
              }
            : old,
      );

      return { previous };
    },
    onError: (_err, { boardId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["trello", "cards", boardId],
          context.previous,
        );
      }
    },
    onSettled: (_data, _err, { boardId }) => {
      queryClient.invalidateQueries({
        queryKey: ["trello", "cards", boardId],
      });
    },
  });
}
