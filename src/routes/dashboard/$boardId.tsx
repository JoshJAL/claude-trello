import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getSession } from "#/lib/auth.functions";
import { BoardPanel } from "#/components/BoardPanel";
import { SessionLog } from "#/components/SessionLog";
import { PageSkeleton } from "#/components/PageSkeleton";
import { useBoardData, useBoards } from "#/hooks/useBoardData";
import { useClaudeSession } from "#/hooks/useClaudeSession";

export const Route = createFileRoute("/dashboard/$boardId")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
    return { user: session.user };
  },
  component: BoardPage,
  pendingComponent: PageSkeleton,
});

function BoardPage() {
  const { boardId } = Route.useParams();
  const { isRunning, logs, error, pendingQuestion, start, stop, sendMessage } =
    useClaudeSession(boardId);
  const [cwd, setCwd] = useState("");
  const [initialMessage, setInitialMessage] = useState("");

  const { data } = useBoardData(boardId, isRunning);
  const { data: boards } = useBoards();
  const boardName = boards?.find((b) => b.id === boardId)?.name ?? boardId;

  function handleStartSession() {
    if (!data?.cards) return;
    if (!cwd.trim()) return;

    start(
      {
        board: { id: boardId, name: boardName },
        cards: data.cards,
        doneListId: data.doneListId ?? undefined,
      },
      cwd.trim(),
      initialMessage.trim() || undefined,
    );
  }

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="text-sm text-[var(--lagoon)] hover:underline"
          >
            &larr; All boards
          </Link>
        </div>

        {/* Session controls — sticky so stop button is always reachable */}
        <div className="sticky top-14 z-40 -mx-4 bg-[var(--sand)] px-4 py-3">
          <div className="island-shell flex flex-col gap-3 rounded-xl p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label
                  htmlFor="cwd"
                  className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]"
                >
                  Project directory
                </label>
                <input
                  id="cwd"
                  type="text"
                  value={cwd}
                  onChange={(e) => setCwd(e.target.value)}
                  disabled={isRunning}
                  placeholder="/home/user/my-project"
                  className="w-full rounded-lg border border-[var(--shore-line)] bg-white/60 px-3 py-2 text-sm text-[var(--sea-ink)] outline-none transition focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[var(--lagoon)]/20 disabled:opacity-50 dark:bg-white/5"
                />
              </div>

              {!isRunning && (
                <div className="flex-1">
                  <label
                    htmlFor="initial-message"
                    className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]"
                  >
                    Initial instructions{" "}
                    <span className="font-normal text-[var(--shore-line)]">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    id="initial-message"
                    value={initialMessage}
                    onChange={(e) => setInitialMessage(e.target.value)}
                    placeholder='e.g. "Check the development branch for comparison" or "Focus on the API cards first"'
                    rows={2}
                    className="w-full resize-none rounded-lg border border-[var(--shore-line)] bg-white/60 px-3 py-2 text-sm text-[var(--sea-ink)] outline-none transition focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[var(--lagoon)]/20 dark:bg-white/5"
                  />
                </div>
              )}

              {isRunning ? (
                <button
                  onClick={stop}
                  className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Stop Session
                </button>
              ) : (
                <button
                  onClick={handleStartSession}
                  disabled={!data?.cards || data.cards.length === 0 || !cwd.trim()}
                  className="shrink-0 rounded-lg bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  Start Claude Session
                </button>
              )}
            </div>

            {isRunning && (
              <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                Session running in {cwd}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <SessionLog
          logs={logs}
          isRunning={isRunning}
          pendingQuestion={pendingQuestion}
          onSendMessage={sendMessage}
        />

        <BoardPanel boardId={boardId} boardName={boardName} polling={isRunning} />
      </div>
    </main>
  );
}
