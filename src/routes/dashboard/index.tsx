import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { useBoards } from "#/hooks/useBoardData";

export const Route = createFileRoute("/dashboard/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
    return { user: session.user };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const { data: boards, isLoading, error } = useBoards();
  const navigate = useNavigate();

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="island-shell rounded-2xl p-8">
          <h1 className="mb-2 text-2xl font-bold text-[var(--sea-ink)]">
            Dashboard
          </h1>
          <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
            Welcome back, {user.name}. Select a Trello board to get started.
          </p>

          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-[var(--foam)]"
                />
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load boards: {error.message}
            </p>
          )}

          {boards && boards.length === 0 && (
            <p className="text-sm text-[var(--sea-ink-soft)]">
              No open boards found. Create a board in Trello first.
            </p>
          )}

          {boards && boards.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() =>
                    navigate({
                      to: "/dashboard/$boardId",
                      params: { boardId: board.id },
                    })
                  }
                  className="flex flex-col items-start rounded-xl border border-[var(--shore-line)] bg-white/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--lagoon)] hover:shadow-md dark:bg-white/5"
                >
                  <span className="text-sm font-semibold text-[var(--sea-ink)]">
                    {board.name}
                  </span>
                  {board.desc && (
                    <span className="mt-1 line-clamp-2 text-xs text-[var(--sea-ink-soft)]">
                      {board.desc}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
