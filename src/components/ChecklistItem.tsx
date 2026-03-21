import type { TrelloCheckItem } from "#/lib/types";

interface ChecklistItemProps {
  item: TrelloCheckItem;
  cardId: string;
  onToggle: (checkItemId: string, newState: "complete" | "incomplete") => void;
  disabled?: boolean;
}

export function ChecklistItem({
  item,
  onToggle,
  disabled,
}: ChecklistItemProps) {
  const isComplete = item.state === "complete";

  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--foam)] ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={isComplete}
        onChange={() =>
          onToggle(item.id, isComplete ? "incomplete" : "complete")
        }
        disabled={disabled}
        className="h-4 w-4 rounded border-[var(--shore-line)] text-[var(--lagoon)] accent-[var(--lagoon)]"
      />
      <span
        className={
          isComplete
            ? "text-[var(--sea-ink-soft)] line-through"
            : "text-[var(--sea-ink)]"
        }
      >
        {item.name}
      </span>
    </label>
  );
}
