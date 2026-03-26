import { useState } from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { useSessionList, useDeleteSession } from "#/hooks/useSessionHistory";
import { PageSkeleton } from "#/components/PageSkeleton";
import type { SessionStatus, AgentSessionSummary } from "#/lib/types";
import {
  Trello,
  Github,
  Gitlab,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/history/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
  },
  component: HistoryPage,
  pendingComponent: PageSkeleton,
});

const SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "trello", label: "Trello" },
  { value: "github", label: "GitHub" },
  { value: "gitlab", label: "GitLab" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "running", label: "Running" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "costliest", label: "Most expensive" },
];

function SourceIcon({ source }: { source: string }) {
  switch (source) {
    case "github":
      return <Github size={16} />;
    case "gitlab":
      return <Gitlab size={16} />;
    default:
      return <Trello size={16} />;
  }
}

function StatusBadge({ status }: { status: SessionStatus }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle2 size={12} /> Completed
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <XCircle size={12} /> Failed
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Ban size={12} /> Cancelled
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <Loader2 size={12} className="animate-spin" /> Running
        </span>
      );
  }
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return "<1s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatCost(cents: number): string {
  if (cents === 0) return "-";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SessionRow({
  session,
  onDelete,
}: {
  session: AgentSessionSummary;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-(--shore-line) bg-white/60 px-4 py-3 transition hover:border-(--lagoon) dark:bg-white/5">
      <Link
        to="/history/$sessionId"
        params={{ sessionId: session.id }}
        className="flex flex-1 items-center gap-4 no-underline"
      >
        <div className="flex items-center gap-2 text-(--sea-ink-soft)">
          <SourceIcon source={session.source} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-(--sea-ink)">
            {session.sourceName}
          </span>
          <span className="text-xs text-(--sea-ink-soft)">
            {session.providerId} / {session.mode}
            {session.mode === "parallel" && session.maxConcurrency
              ? ` (${session.maxConcurrency}x)`
              : ""}
          </span>
        </div>

        <StatusBadge status={session.status} />

        <span className="hidden text-xs text-(--sea-ink-soft) sm:block">
          {session.tasksCompleted}/{session.tasksTotal} tasks
        </span>

        <span className="hidden text-xs text-(--sea-ink-soft) md:block">
          {formatCost(session.totalCostCents)}
        </span>

        <span className="hidden items-center gap-1 text-xs text-(--sea-ink-soft) lg:flex">
          <Clock size={12} />
          {formatDuration(session.durationMs)}
        </span>

        <span className="hidden text-xs text-(--sea-ink-soft) xl:block">
          {formatDate(session.startedAt)}
        </span>
      </Link>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(session.id);
        }}
        className="shrink-0 rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
        title="Delete session"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function HistoryPage() {
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, error } = useSessionList({
    source: source || undefined,
    status: (status as SessionStatus) || undefined,
    sort: sort as "newest" | "oldest" | "costliest",
    limit,
    offset: page * limit,
  });

  const deleteMutation = useDeleteSession();

  const sessions = data?.sessions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this session? This cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="island-shell rounded-2xl p-8">
          <h1 className="mb-2 text-2xl font-bold text-(--sea-ink)">
            Session History
          </h1>
          <p className="mb-6 text-sm text-(--sea-ink-soft)">
            View past AI agent sessions and their results.
          </p>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-2">
            <select
              value={source}
              onChange={(e) => { setSource(e.target.value); setPage(0); }}
              className="rounded-lg border border-(--shore-line) bg-white/60 px-3 py-1.5 text-sm text-(--sea-ink) dark:bg-white/5"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(0); }}
              className="rounded-lg border border-(--shore-line) bg-white/60 px-3 py-1.5 text-sm text-(--sea-ink) dark:bg-white/5"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(0); }}
              className="rounded-lg border border-(--shore-line) bg-white/60 px-3 py-1.5 text-sm text-(--sea-ink) dark:bg-white/5"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={`skeleton-${n}`}
                  className="h-14 animate-pulse rounded-xl bg-(--foam)"
                />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load sessions: {error.message}
            </p>
          )}

          {/* Empty state */}
          {!isLoading && !error && sessions.length === 0 && (
            <p className="text-sm text-(--sea-ink-soft)">
              No sessions yet. Start one from the dashboard.
            </p>
          )}

          {/* Session list */}
          {sessions.length > 0 && (
            <div className="space-y-2">
              {sessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-(--shore-line) px-3 py-1.5 text-sm text-(--sea-ink) disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-(--sea-ink-soft)">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-(--shore-line) px-3 py-1.5 text-sm text-(--sea-ink) disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
