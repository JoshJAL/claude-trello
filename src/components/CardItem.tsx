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
}

export function CardItem({ card, onCheckToggle, done }: CardItemProps) {
  const totalItems = card.checklists.reduce(
    (sum, cl) => sum + cl.checkItems.length,
    0,
  );
  const completedItems = card.checklists.reduce(
    (sum, cl) =>
      sum + cl.checkItems.filter((i) => i.state === "complete").length,
    0,
  );

  return (
    <div
      className={`island-shell rounded-xl p-4 ${done ? "opacity-60" : ""}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3
          className={`text-sm font-semibold ${done ? "text-green-800 line-through dark:text-green-400" : "text-[var(--sea-ink)]"}`}
        >
          {done && <span className="mr-1.5 no-underline">&#10003;</span>}
          {card.name}
        </h3>
        {totalItems > 0 && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              done
                ? "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-300"
                : "bg-[var(--foam)] text-[var(--sea-ink-soft)]"
            }`}
          >
            {completedItems}/{totalItems}
          </span>
        )}
      </div>

      {card.desc && !done && (
        <p className="mb-3 text-xs text-[var(--sea-ink-soft)]">{card.desc}</p>
      )}

      {!done &&
        card.checklists.map((checklist) => (
          <div key={checklist.id} className="mt-2">
            {card.checklists.length > 1 && (
              <p className="mb-1 text-xs font-medium text-[var(--sea-ink-soft)]">
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
        <p className="text-xs text-[var(--sea-ink-soft)] italic">
          No checklists
        </p>
      )}
    </div>
  );
}
