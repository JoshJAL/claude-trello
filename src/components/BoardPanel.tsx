import { useBoardData, useCheckItem } from "#/hooks/useBoardData";
import { CardItem } from "#/components/CardItem";
import type { TrelloCard } from "#/lib/types";

interface BoardPanelProps {
  boardId: string;
  boardName: string;
  polling?: boolean;
  onWorkOnThis?: (card: TrelloCard) => void;
  isSessionRunning?: boolean;
}

export function BoardPanel({
  boardId,
  boardName,
  polling = false,
  onWorkOnThis,
  isSessionRunning,
}: BoardPanelProps) {
  const { data, isLoading, error } = useBoardData(boardId, polling);
  const checkMutation = useCheckItem();

  function handleCheckToggle(
    cardId: string,
    checkItemId: string,
    state: "complete" | "incomplete",
  ) {
    checkMutation.mutate({ cardId, checkItemId, state, boardId });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {["skeleton-1", "skeleton-2", "skeleton-3"].map((id) => (
          <div
            key={id}
            className="island-shell h-24 animate-pulse rounded-xl"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
        Failed to load cards: {error.message}
      </div>
    );
  }

  if (!data || data.cards.length === 0) {
    return (
      <div className="island-shell rounded-xl p-6 text-center text-sm text-[var(--sea-ink-soft)]">
        No cards found on &ldquo;{boardName}&rdquo;.
      </div>
    );
  }

  const doneListId = data.doneListId;
  const activeCards = data.cards
    .filter((c) => c.idList !== doneListId)
    .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  const doneCards = doneListId
    ? data.cards
        .filter((c) => c.idList === doneListId)
        .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))
    : [];

  return (
    <div className="space-y-6">
      {activeCards.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--sea-ink)]">
            Active ({activeCards.length})
          </h3>
          {activeCards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              boardId={boardId}
              onCheckToggle={handleCheckToggle}
              done={false}
            />
          ))}
        </div>
      )}

      {doneCards.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-green-900 dark:text-green-400">
            Done ({doneCards.length})
          </h3>
          {doneCards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              boardId={boardId}
              onCheckToggle={handleCheckToggle}
              done={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
