import type { AgentStatus } from "#/lib/types";

const stateLabels: Record<AgentStatus["state"], string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  merging: "Merging",
  conflict: "Conflict",
};

const stateColors: Record<AgentStatus["state"], string> = {
  queued: "text-[var(--sea-ink-soft)]",
  running: "text-blue-600 dark:text-blue-400",
  completed: "text-green-600 dark:text-green-400",
  failed: "text-red-600 dark:text-red-400",
  merging: "text-amber-600 dark:text-amber-400",
  conflict: "text-red-600 dark:text-red-400",
};

const stateDots: Record<AgentStatus["state"], string> = {
  queued: "bg-gray-400",
  running: "bg-blue-500 animate-pulse",
  completed: "bg-green-500",
  failed: "bg-red-500",
  merging: "bg-amber-500 animate-pulse",
  conflict: "bg-red-500",
};

interface AgentStatusRowProps {
  status: AgentStatus;
  isSelected: boolean;
  onClick: () => void;
}

export function AgentStatusRow({
  status,
  isSelected,
  onClick,
}: AgentStatusRowProps) {
  const progress =
    status.checklistTotal > 0
      ? Math.round((status.checklistDone / status.checklistTotal) * 100)
      : 0;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition ${
        isSelected
          ? "border-[var(--lagoon)] bg-[var(--lagoon)]/5"
          : "border-[var(--shore-line)] hover:border-[var(--lagoon)]/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${stateDots[status.state]}`}
          />
          <span className="truncate text-sm font-medium text-[var(--sea-ink)]">
            {status.cardName}
          </span>
        </div>
        <span className={`shrink-0 text-xs font-medium ${stateColors[status.state]}`}>
          {stateLabels[status.state]}
        </span>
      </div>

      {status.checklistTotal > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-[var(--sea-ink-soft)]">
            <span>
              {status.checklistDone}/{status.checklistTotal} items
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--shore-line)]">
            <div
              className="h-full rounded-full bg-[var(--lagoon)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status.error && (
        <p className="mt-1 truncate text-xs text-red-600 dark:text-red-400">
          {status.error}
        </p>
      )}

      {status.durationMs != null && status.state !== "running" && (
        <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
          {(status.durationMs / 1000).toFixed(1)}s
        </p>
      )}
    </button>
  );
}
