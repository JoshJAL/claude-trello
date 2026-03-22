import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { useBoards } from "#/hooks/useBoardData";
import { useIntegrationStatus } from "#/hooks/useIntegrationStatus";
import { useSearchFilter } from "#/hooks/useSearchFilter";
import { PageSkeleton } from "#/components/PageSkeleton";

export const Route = createFileRoute("/dashboard/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
    return { user: session.user };
  },
  validateSearch: {
    q: String
  },
  component: DashboardPage,
  pendingComponent: PageSkeleton,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const { trelloLinked } = useIntegrationStatus();
  const { data: boards, isLoading, error } = useBoards();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const filteredBoards = boards
    ? boards.filter((board) => {
        const query = q.toLowerCase();
        return (
          board.name.toLowerCase().includes(query) ||
          (board.desc ?? "").toLowerCase().includes(query)
        );
      })
    : [];

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="island-shell rounded-2xl p-8">
          <h1 className="mb-2 text-2xl font-bold text-[var(--sea-ink)]">
            Trello Boards
          </h1>
          <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
            Welcome back, {user.name}. Select a Trello board to get started.
          </p>

          {!trelloLinked && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                You haven&apos;t connected Trello yet.{" "}
                <Link
                  to="/settings"
                  className="font-semibold text-[var(--lagoon)] hover:underline"
                >
                  Connect it in Settings
                </Link>{" "}
                to see your boards here.
              </p>
            </div>
          )}

          {trelloLinked && isLoading && (
            <div className="space-y-2">
              {["skeleton-1", "skeleton-2", "skeleton-3"].map((id) => (
                <div
                  key={id}
                  className="h-14 animate-pulse rounded-xl bg-[var(--foam)]"
                />
              ))}
            </div>
          )}

          {trelloLinked && error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load boards: {error.message}
            </p>
          )}

          {trelloLinked && boards && boards.length === 0 && (
            <p className="text-sm text-[var(--sea-ink-soft)]">
              No open boards found. Create a board in Trello first.
            </p>
          )}

          {trelloLinked && boards && boards.length > 0 && (
            <>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search boards…"
                className="mb-4 w-full rounded-xl border border-[var(--shore-line)] bg-white/60 px-4 py-2 text-sm text-[var(--sea-ink)] placeholder-[var(--sea-ink-soft)] outline-none focus:border-[var(--lagoon)] dark:bg-white/5"
              />

              {filteredBoards.length === 0 ? (
                <p className="text-sm text-[var(--sea-ink-soft)]">
                  No results for &ldquo;{q}&rdquo;.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredBoards.map((board) => (
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
            </>
          )}
        </div>
      </div>
    </main>
  );
}
