import { useState, useMemo, useEffect, useRef } from "react";
import {
  createFileRoute,
  redirect,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { useGitHubRepos } from "#/hooks/useGitHubRepos";
import { useIntegrationStatus } from "#/hooks/useIntegrationStatus";
import { PageSkeleton } from "#/components/PageSkeleton";
import { UpdateBanner } from "#/components/UpdateBanner";
import { useDebounce } from "#/hooks/useDebounce";

export const Route = createFileRoute("/dashboard/github/")({
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
  component: GitHubDashboardPage,
  pendingComponent: PageSkeleton,
});

function GitHubDashboardPage() {
  const { user } = Route.useRouteContext();
  const { q: urlQ } = Route.useSearch();
  const { githubLinked } = useIntegrationStatus();
  const { data: repos, isLoading, error } = useGitHubRepos();
  const navigate = useNavigate({ from: "/dashboard/github/" });

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

  // Visibility filter state
  const [visibilityFilter, setVisibilityFilter] = useState('All');

  // Memoised filter — recomputes only when repos data, debounced query, or visibility filter changes
  const filteredRepos = useMemo(
    () =>
      repos
        ? repos.filter((repo) => {
          if (visibilityFilter === 'Public' && repo.private) return false;
          if (visibilityFilter === 'Private' && !repo.private) return false;
            const query = debouncedQ.toLowerCase();
            return (
              repo.full_name.toLowerCase().includes(query) ||
              (repo.description ?? "").toLowerCase().includes(query)
            );
          })
        : [],
    [repos, debouncedQ, visibilityFilter],
  );

  // True while the user is still typing (debounce window)
  const isPending = inputValue !== debouncedQ;

  return (
    <main className="page-wrap px-4 py-8">
      <UpdateBanner />
      <div className="mx-auto max-w-4xl">
        <div className="island-shell rounded-md p-8">
          <h1 className="mb-2 text-2xl font-bold text-(--sea-ink)">
            GitHub Repos
          </h1>
          <p className="mb-6 text-sm text-(--sea-ink-soft)">
            Welcome back, {user.name}. Select a GitHub repo to work on its
            issues.
          </p>

          {!githubLinked && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                You haven&apos;t connected GitHub yet.{" "}
                <Link
                  to="/settings"
                  className="font-semibold text-(--lagoon) hover:underline"
                >
                  Connect it in Settings
                </Link>{" "}
                to see your repos here.
              </p>
            </div>
          )}

          {githubLinked && isLoading && (
            <div className="space-y-2">
              {["skeleton-1", "skeleton-2", "skeleton-3"].map((id) => (
                <div
                  key={id}
                  className="h-14 animate-pulse rounded-md bg-(--foam)"
                />
              ))}
            </div>
          )}

          {githubLinked && error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load repos: {error.message}
            </p>
          )}

          {githubLinked && repos && repos.length === 0 && (
            <p className="text-sm text-(--sea-ink-soft)">
              No repos found. Make sure your GitHub account has accessible
              repositories.
            </p>
          )}

          {githubLinked && repos && repos.length > 0 && (
            <>
              <div className="relative mb-4">
                <div className="mb-4">
                  <label htmlFor="github-visibility-filter" className="mr-2">Filter:</label>
                  <select
                    id="github-visibility-filter"
                    value={visibilityFilter}
                    onChange={(e) => setVisibilityFilter(e.target.value)}
                    className="rounded border border-(--shore-line) bg-white px-2 py-1 text-(--sea-ink) dark:bg-[#1e1e1e] dark:text-[#e0e0e0]"
                  >
                    <option value="All">All</option>
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
                <input
                  type="search"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Search repos…"
                  className="w-full rounded-md border border-(--shore-line) bg-white/60 px-4 py-2 text-sm text-(--sea-ink) placeholder-(--sea-ink-soft) outline-none focus:border-(--lagoon) dark:bg-white/5"
                />
                {isPending && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-(--sea-ink-soft)">
                    …
                  </span>
                )}
              </div>

              <p className="mb-2 text-sm text-(--sea-ink-soft)">
                  Showing {filteredRepos.length} of {repos.length} repositories
                </p>
                {isPending ? (
                <div className="space-y-2">
                  {["pending-1", "pending-2", "pending-3"].map((id) => (
                    <div
                      key={id}
                      className="h-14 animate-pulse rounded-md bg-(--foam)"
                    />
                  ))}
                </div>
              ) : filteredRepos.length === 0 ? (
                <p className="text-sm text-(--sea-ink-soft)">
                  No results for &ldquo;{debouncedQ}&rdquo;.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredRepos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() =>
                        navigate({
                          to: "/dashboard/github/$owner/$repo",
                          params: {
                            owner: repo.owner.login,
                            repo: repo.name,
                          },
                        })
                      }
                      className="flex flex-col items-start rounded-md border border-(--shore-line) bg-white/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-(--lagoon) hover:shadow-md dark:bg-white/5"
                    >
                      <span className="text-sm font-semibold text-(--sea-ink)">
                        {repo.full_name}
                      </span>
                      {repo.description && (
                        <span className="mt-1 line-clamp-2 text-xs text-(--sea-ink-soft)">
                          {repo.description}
                        </span>
                      )}
                      {repo.private && (
                        <span className="mt-2 rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide bg-(--foam) text-(--sea-ink-soft)">
                          Private
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
