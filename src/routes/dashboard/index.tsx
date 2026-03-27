import { useState, useMemo, useEffect, useRef } from "react";
import {
  createFileRoute,
  redirect,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { useBoards } from "#/hooks/useBoardData";
import { useIntegrationStatus } from "#/hooks/useIntegrationStatus";
import { PageSkeleton } from "#/components/PageSkeleton";
import { UpdateBanner } from "#/components/UpdateBanner";
import { useDebounce } from "#/hooks/useDebounce";

export const Route = createFileRoute("/dashboard/")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string | undefined) ?? "",
  }),
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
    return { user: session.user };
  },
  component: DashboardPage,
  pendingComponent: PageSkeleton,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const { q: urlQ } = Route.useSearch();
  const { trelloLinked } = useIntegrationStatus();
  const { data: boards, isLoading, error } = useBoards();
  const navigate = useNavigate({ from: "/dashboard/" });

  // Local state for instant input feedback — decoupled from URL
  const [inputValue, setInputValue] = useState(() => urlQ);

  // Debounced value: only updates 400 ms after the user stops typing
  const debouncedQ = useDebounce(inputValue, 400);

  // Track whether a URL update was triggered by us (not by back/forward)
  const isOwnNavRef = useRef(false);

  // Sync debounced value → URL (replace to avoid cluttering browser history)
  useEffect(() => {
    isOwnNavRef.current = true;
    navigate({
      search: { q: debouncedQ },
      replace: true,
    });
  }, [debouncedQ, navigate]);

  // Sync URL → input only on external navigation (back / forward)
  useEffect(() => {
    if (isOwnNavRef.current) {
      isOwnNavRef.current = false;
      return;
    }
    setInputValue(urlQ);
  }, [urlQ]);

  // Memoised filter — recomputes only when boards data or debounced query changes
  const filteredBoards = useMemo(
    () =>
      boards
        ? boards.filter((board) => {
            const query = debouncedQ.toLowerCase();
            return (
              board.name.toLowerCase().includes(query) ||
              (board.desc ?? "").toLowerCase().includes(query)
            );
          })
        : [],
    [boards, debouncedQ],
  );

  // True while the user is still typing (debounce window)
  const isPending = inputValue !== debouncedQ;

  return (
    <main className="page-wrap px-4 py-8">
      <UpdateBanner />
      <div className="mx-auto max-w-4xl">
        <div className="island-shell rounded-md p-8">
          <h1 className="mb-2 text-2xl font-bold text-(--sea-ink)">
            Trello Boards
          </h1>
          <p className="mb-6 text-sm text-(--sea-ink-soft)">
            Welcome back, {user.name}. Select a Trello board to get started.
          </p>

          {!trelloLinked && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                You haven&apos;t connected Trello yet.{" "}
                <Link
                  to="/settings"
                  className="font-semibold text-(--lagoon) hover:underline"
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
                  className="h-14 animate-pulse rounded-md bg-(--foam)"
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
            <p className="text-sm text-(--sea-ink-soft)">
              No open boards found. Create a board in Trello first.
            </p>
          )}

          {trelloLinked && boards && boards.length > 0 && (
            <>
              <div className="relative mb-4">
                <input
                  type="search"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Search boards…"
                  className="w-full rounded-md border border-(--shore-line) bg-white/60 px-4 py-2 text-sm text-(--sea-ink) placeholder-(--sea-ink-soft) outline-none focus:border-(--lagoon) dark:bg-white/5"
                />
                {isPending && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-(--sea-ink-soft)">
                    …
                  </span>
                )}
              </div>

              {isPending ? (
                <div className="space-y-2">
                  {["pending-1", "pending-2", "pending-3"].map((id) => (
                    <div
                      key={id}
                      className="h-14 animate-pulse rounded-md bg-(--foam)"
                    />
                  ))}
                </div>
              ) : filteredBoards.length === 0 ? (
                <p className="text-sm text-(--sea-ink-soft)">
                  No results for &ldquo;{debouncedQ}&rdquo;.
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
                      className="flex flex-col items-start rounded-md border border-(--shore-line) bg-white/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-(--lagoon) hover:shadow-md dark:bg-white/5"
                    >
                      <span className="text-sm font-semibold text-(--sea-ink)">
                        {board.name}
                      </span>
                      {board.desc && (
                        <span className="mt-1 line-clamp-2 text-xs text-(--sea-ink-soft)">
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
