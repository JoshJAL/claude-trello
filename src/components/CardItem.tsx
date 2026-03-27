import type { TrelloCard } from "#/lib/types";
import { ChecklistItem } from "#/components/ChecklistItem";

interface CardItemProps {
  card: TrelloCard;
  boardId: string;
  onCheckToggle: (
    cardId: string,
    checkItemId: string,
    state: "complete" | "incomplete",
  ) => void;
  done?: boolean;
  onWorkOnThis?: (card: TrelloCard) => void;
  isSessionRunning?: boolean;
}

export function CardItem({ card, onCheckToggle, done, onWorkOnThis, isSessionRunning }: CardItemProps) {
  const totalItems = card.checklists.reduce(
    (sum, cl) => sum + cl.checkItems.length,
    0,
  );
  const completedItems = card.checklists.reduce(
    (sum, cl) =>
      sum + cl.checkItems.filter((i) => i.state === "complete").length,
    0,
  );
  
  const hasIncompleteTask = card.checklists.some(checklist =>
    checklist.checkItems.some(item => item.state !== "complete")
  );

  return (
    <div
      className={`island-shell rounded-md p-4 ${done ? "opacity-60" : ""}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3
          className={`text-sm font-semibold ${done ? "text-green-800 line-through dark:text-green-400" : "text-(--sea-ink)"}`}
        >
          {done && <span className="mr-1.5 no-underline">&#10003;</span>}
          {card.name}
        </h3>
        <div className="flex items-center gap-2">
          {!done && onWorkOnThis && hasIncompleteTask && (
            <button
              onClick={() => onWorkOnThis(card)}
              disabled={isSessionRunning}
              className="shrink-0 rounded-md bg-(--lagoon) px-2 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              title={isSessionRunning ? "Stop current session first" : "Work on this card only"}
            >
              Work on this
            </button>
          )}
          {totalItems > 0 && (
            <span
              className={`shrink-0 rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                done
                  ? "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-(--foam) text-(--sea-ink-soft)"
              }`}
            >
              {completedItems}/{totalItems}
            </span>
          )}
        </div>
      </div>

      {card.desc && !done && (
        <p className="mb-3 text-xs text-(--sea-ink-soft)">{card.desc}</p>
      )}

      {!done &&
        card.checklists.map((checklist) => (
          <div key={checklist.id} className="mt-2">
            {card.checklists.length > 1 && (
              <p className="mb-1 text-xs font-medium text-(--sea-ink-soft)">
                {checklist.name}
              </p>
            )}
            <div className="flex flex-col">
              {checklist.checkItems
                .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))
                .map((item) => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    cardId={card.id}
                    onToggle={(checkItemId, state) =>
                      onCheckToggle(card.id, checkItemId, state)
                    }
                  />
                ))}
            </div>
          </div>
        ))}

      {!done && totalItems === 0 && (
        <p className="text-xs text-(--sea-ink-soft) italic">
          No checklists
        </p>
      )}
    </div>
  );
}
