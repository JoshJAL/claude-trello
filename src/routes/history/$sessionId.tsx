import { useState } from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import {
  useSessionDetail,
  useSessionEvents,
  useDeleteSession,
} from "#/hooks/useSessionHistory";
import { PageSkeleton } from "#/components/PageSkeleton";
import type { SessionEvent, SessionStatus } from "#/lib/types";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
  Trash2,
  Clock,
  Trello,
  Github,
  Gitlab,
} from "lucide-react";

export const Route = createFileRoute("/history/$sessionId")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
  },
  component: SessionDetailPage,
  pendingComponent: PageSkeleton,
});

function StatusBadge({ status }: { status: SessionStatus }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle2 size={14} /> Completed
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs font-semibold uppercase tracking-wide bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <XCircle size={14} /> Failed
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Ban size={14} /> Cancelled
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs font-semibold uppercase tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <Loader2 size={14} className="animate-spin" /> Running
        </span>
      );
  }
}

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

const eventTypeStyles: Record<string, string> = {
  assistant: "text-(--sea-ink)",
  tool_use: "text-blue-600 dark:text-blue-400",
  tool_result: "text-green-900 dark:text-green-400 font-medium",
  task_completed: "text-emerald-600 dark:text-emerald-400 font-semibold",
  error: "text-red-600 dark:text-red-400",
  system: "text-(--sea-ink-soft) italic",
  user: "text-(--lagoon) font-medium",
  agent_started: "text-blue-600 dark:text-blue-400 font-medium",
  agent_completed: "text-emerald-600 dark:text-emerald-400 font-medium",
  agent_failed: "text-red-600 dark:text-red-400 font-medium",
  merge_result: "text-purple-600 dark:text-purple-400",
  done: "text-(--sea-ink-soft) italic",
};

function getEventSummary(event: SessionEvent): string {
  const content = event.content;

  if (typeof content.content === "string" && content.content) {
    // Truncate long content
    const text = content.content as string;
    return text.length > 200 ? text.slice(0, 200) + "..." : text;
  }

  if (event.type === "tool_use" && content.toolName) {
    const input = content.toolInput
      ? JSON.stringify(content.toolInput).slice(0, 100)
      : "";
    return `${content.toolName as string}(${input})`;
  }

  if (event.type === "tool_result" && content.toolName) {
    const result = typeof content.toolResult === "string"
      ? content.toolResult.slice(0, 150)
      : "";
    return `${content.toolName as string} -> ${result}`;
  }

  if (event.type === "task_completed") {
    return `Task completed: ${(content.toolName as string) ?? "task"}`;
  }

  if (event.type === "error" && content.error) {
    return `Error: ${content.error as string}`;
  }

  if (event.type === "agent_started" || event.type === "agent_queued") {
    return `Agent ${event.type === "agent_started" ? "started" : "queued"}: ${(content.cardName as string) ?? (content.cardId as string) ?? ""}`;
  }

  if (event.type === "agent_completed" || event.type === "agent_failed") {
    return `Agent ${event.type === "agent_completed" ? "completed" : "failed"}: ${(content.cardId as string) ?? ""}`;
  }

  if (event.type === "summary") {
    return "Session summary";
  }

  if (event.type === "done") {
    return "Session finished";
  }

  // Fallback: show JSON preview
  const json = JSON.stringify(content);
  return json.length > 150 ? json.slice(0, 150) + "..." : json;
}

function SessionDetailPage() {
  const { sessionId } = Route.useParams();
  const { data: detailData, isLoading: detailLoading } = useSessionDetail(sessionId);
  const [eventsPage, setEventsPage] = useState(0);
  const eventsLimit = 100;
  const {
    data: eventsData,
    isLoading: eventsLoading,
  } = useSessionEvents(sessionId, eventsLimit, eventsPage * eventsLimit);
  const deleteMutation = useDeleteSession();

  const agentSession = detailData?.session;
  const events = eventsData?.events ?? [];
  const eventsTotal = eventsData?.total ?? 0;
  const eventsTotalPages = Math.ceil(eventsTotal / eventsLimit);

  const handleDelete = () => {
    if (window.confirm("Delete this session and all its events? This cannot be undone.")) {
      deleteMutation.mutate(sessionId, {
        onSuccess: () => {
          window.location.href = "/history";
        },
      });
    }
  };

  if (detailLoading) {
    return <PageSkeleton />;
  }

  if (!agentSession) {
    return (
      <main className="page-wrap px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="island-shell rounded-md p-8">
            <p className="text-sm text-(--sea-ink-soft)">Session not found.</p>
            <Link to="/history" className="mt-2 inline-block text-sm text-(--lagoon)">
              Back to History
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="island-shell rounded-md p-6">
          <div className="mb-4 flex items-center gap-2">
            <Link
              to="/history"
              className="rounded-md p-1.5 text-(--sea-ink-soft) transition hover:bg-(--foam)"
              title="Back to History"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2 text-(--sea-ink-soft)">
              <SourceIcon source={agentSession.source} />
            </div>
            <h1 className="flex-1 text-lg font-bold text-(--sea-ink)">
              {agentSession.sourceName}
            </h1>
            <StatusBadge status={agentSession.status} />
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md bg-(--foam) p-3">
              <p className="text-xs text-(--sea-ink-soft)">Provider</p>
              <p className="text-sm font-medium text-(--sea-ink)">
                {agentSession.providerId}
              </p>
            </div>
            <div className="rounded-md bg-(--foam) p-3">
              <p className="text-xs text-(--sea-ink-soft)">Mode</p>
              <p className="text-sm font-medium text-(--sea-ink)">
                {agentSession.mode}
                {agentSession.mode === "parallel" && agentSession.maxConcurrency
                  ? ` (${agentSession.maxConcurrency}x)`
                  : ""}
              </p>
            </div>
            <div className="rounded-md bg-(--foam) p-3">
              <p className="text-xs text-(--sea-ink-soft)">Tasks</p>
              <p className="text-sm font-medium text-(--sea-ink)">
                {agentSession.tasksCompleted}/{agentSession.tasksTotal}
              </p>
            </div>
            <div className="rounded-md bg-(--foam) p-3">
              <p className="text-xs text-(--sea-ink-soft)">Duration</p>
              <p className="flex items-center gap-1 text-sm font-medium text-(--sea-ink)">
                <Clock size={14} />
                {formatDuration(agentSession.durationMs)}
              </p>
            </div>
            <div className="rounded-md bg-(--foam) p-3">
              <p className="text-xs text-(--sea-ink-soft)">Cost</p>
              <p className="text-sm font-medium text-(--sea-ink)">
                {formatCost(agentSession.totalCostCents)}
              </p>
            </div>
            <div className="rounded-md bg-(--foam) p-3">
              <p className="text-xs text-(--sea-ink-soft)">Tokens</p>
              <p className="text-sm font-medium text-(--sea-ink)">
                {agentSession.inputTokens.toLocaleString()} in / {agentSession.outputTokens.toLocaleString()} out
              </p>
            </div>
            <div className="rounded-md bg-(--foam) p-3 sm:col-span-2">
              <p className="text-xs text-(--sea-ink-soft)">Started</p>
              <p className="text-sm font-medium text-(--sea-ink)">
                {new Date(agentSession.startedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Error message */}
          {agentSession.errorMessage && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
              <p className="text-sm text-red-700 dark:text-red-400">
                {agentSession.errorMessage}
              </p>
            </div>
          )}

          {/* Initial message */}
          {agentSession.initialMessage && (
            <div className="mt-4 rounded-md bg-(--foam) p-3">
              <p className="mb-1 text-xs text-(--sea-ink-soft)">Initial Message</p>
              <p className="text-sm text-(--sea-ink)">
                {agentSession.initialMessage}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            {agentSession.status !== "running" && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Event Log */}
        <div className="island-shell rounded-md p-6">
          <h2 className="mb-3 text-sm font-semibold text-(--sea-ink)">
            Event Log ({eventsTotal} events)
          </h2>

          {eventsLoading && (
            <div className="space-y-1">
              {["skel-1", "skel-2", "skel-3", "skel-4", "skel-5"].map((id) => (
                <div
                  key={id}
                  className="h-6 animate-pulse rounded bg-(--foam)"
                />
              ))}
            </div>
          )}

          {!eventsLoading && events.length === 0 && (
            <p className="text-sm text-(--sea-ink-soft)">No events recorded.</p>
          )}

          {events.length > 0 && (
            <div className="max-h-[calc(100vh-20rem)] space-y-1 overflow-y-auto rounded-md bg-(--foam) p-3 font-mono text-xs">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={eventTypeStyles[event.type] ?? "text-(--sea-ink)"}
                >
                  <span className="mr-2 text-(--sea-ink-soft)">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  {event.agentIndex !== null && (
                    <span className="mr-1 rounded bg-blue-100 px-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      A{event.agentIndex}
                    </span>
                  )}
                  <span className="whitespace-pre-wrap break-words">
                    {getEventSummary(event)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Events pagination */}
          {eventsTotalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => setEventsPage((p) => Math.max(0, p - 1))}
                disabled={eventsPage === 0}
                className="rounded-md border border-(--shore-line) px-3 py-1 text-xs text-(--sea-ink) disabled:opacity-40"
              >
                Newer
              </button>
              <span className="text-xs text-(--sea-ink-soft)">
                Page {eventsPage + 1} of {eventsTotalPages}
              </span>
              <button
                onClick={() => setEventsPage((p) => Math.min(eventsTotalPages - 1, p + 1))}
                disabled={eventsPage >= eventsTotalPages - 1}
                className="rounded-md border border-(--shore-line) px-3 py-1 text-xs text-(--sea-ink) disabled:opacity-40"
              >
                Older
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
