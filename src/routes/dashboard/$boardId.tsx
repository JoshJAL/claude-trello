import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { BoardPanel } from "#/components/BoardPanel";
import { SessionLog } from "#/components/SessionLog";
import { ParallelSessionView } from "#/components/ParallelSessionView";
import { SessionControls } from "#/components/SessionControls";
import { PageSkeleton } from "#/components/PageSkeleton";
import { useBoardData, useBoards } from "#/hooks/useBoardData";
import { useClaudeSession } from "#/hooks/useClaudeSession";
import { useParallelSession } from "#/hooks/useParallelSession";

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
  const sequential = useClaudeSession(boardId);
  const parallel = useParallelSession(boardId);

  const isRunning = sequential.isRunning || parallel.isRunning;

  const { data } = useBoardData(boardId, isRunning);
  const { data: boards } = useBoards();
  const boardName = boards?.find((b) => b.id === boardId)?.name ?? boardId;

  const activeCards = data?.cards
    ? data.doneListId
      ? data.cards.filter((c) => c.idList !== data.doneListId)
      : data.cards
    : [];

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

        <SessionControls
          isRunning={isRunning}
          canStart={!!data?.cards && data.cards.length > 0}
          activeCardCount={activeCards.length}
          runningLabel={
            sequential.isRunning
              ? `Session running`
              : `Parallel session running (${parallel.agents.size} agents)`
          }
          source="trello"
          onStart={({ cwd, userMessage, mode, concurrency, providerId, webMode }) => {
            if (!data?.cards) return;

            const boardData = {
              board: { id: boardId, name: boardName },
              cards: data.cards,
              doneListId: data.doneListId ?? undefined,
            };

            const opts = { providerId, source: "trello" as const, webMode };

            if (mode === "parallel" && !webMode) {
              parallel.start(boardData, cwd, concurrency, userMessage, opts);
            } else {
              sequential.start(boardData, cwd, userMessage, opts);
            }
          }}
          onStop={() => {
            if (sequential.isRunning) sequential.stop();
            if (parallel.isRunning) parallel.stop();
          }}
        />

        {(sequential.error || parallel.error) && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            {sequential.error || parallel.error}
          </div>
        )}

        {/* Session output — sequential or parallel */}
        {sequential.isRunning || sequential.logs.length > 0 ? (
          <SessionLog
            logs={sequential.logs}
            isRunning={sequential.isRunning}
            pendingQuestion={sequential.pendingQuestion}
            onSendMessage={sequential.sendMessage}
          />
        ) : null}

        {parallel.isRunning ||
        parallel.agents.size > 0 ||
        parallel.summary ? (
          <ParallelSessionView
            agents={parallel.agents}
            agentLogs={parallel.agentLogs}
            summary={parallel.summary}
          />
        ) : null}

        <BoardPanel boardId={boardId} boardName={boardName} polling={isRunning} />
      </div>
    </main>
  );
}
