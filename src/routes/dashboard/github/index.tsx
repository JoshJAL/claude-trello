import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { useGitHubRepos } from "#/hooks/useGitHubRepos";
import { useIntegrationStatus } from "#/hooks/useIntegrationStatus";
import { useSearchFilter } from "#/hooks/useSearchFilter";
import { PageSkeleton } from "#/components/PageSkeleton";

export const Route = createFileRoute("/dashboard/github/")({
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
  component: GitHubDashboardPage,
  pendingComponent: PageSkeleton,
});

function GitHubDashboardPage() {
  const { user } = Route.useRouteContext();
  const { githubLinked } = useIntegrationStatus();
  const { data: repos, isLoading, error } = useGitHubRepos();
  const navigate = useNavigate();
  
  const {
    query,
    setQuery,
    filteredItems: filteredRepos,
    isSearching
  } = useSearchFilter(repos, {
    filterFn: (repo, searchQuery) => {
      return (
        repo.full_name.toLowerCase().includes(searchQuery) ||
        (repo.description ?? "").toLowerCase().includes(searchQuery)
      );
    }
  });

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="island-shell rounded-2xl p-8">
          <h1 className="mb-2 text-2xl font-bold text-[var(--sea-ink)]">
            GitHub Repos
          </h1>
          <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
            Welcome back, {user.name}. Select a GitHub repo to work on its
            issues.
          </p>

          {!githubLinked && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                You haven&apos;t connected GitHub yet.{" "}
                <Link
                  to="/settings"
                  className="font-semibold text-[var(--lagoon)] hover:underline"
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
                  className="h-14 animate-pulse rounded-xl bg-[var(--foam)]"
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
            <p className="text-sm text-[var(--sea-ink-soft)]">
              No repos found. Make sure your GitHub account has accessible
              repositories.
            </p>
          )}

          {githubLinked && repos && repos.length > 0 && (
            <>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search repos…"
                className="mb-4 w-full rounded-xl border border-[var(--shore-line)] bg-white/60 px-4 py-2 text-sm text-[var(--sea-ink)] placeholder-[var(--sea-ink-soft)] outline-none focus:border-[var(--lagoon)] dark:bg-white/5"
              />

              {filteredRepos.length === 0 ? (
                <p className="text-sm text-[var(--sea-ink-soft)]">
                  No results for &ldquo;{q}&rdquo;.
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
                      className="flex flex-col items-start rounded-xl border border-[var(--shore-line)] bg-white/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--lagoon)] hover:shadow-md dark:bg-white/5"
                    >
                      <span className="text-sm font-semibold text-[var(--sea-ink)]">
                        {repo.full_name}
                      </span>
                      {repo.description && (
                        <span className="mt-1 line-clamp-2 text-xs text-[var(--sea-ink-soft)]">
                          {repo.description}
                        </span>
                      )}
                      {repo.private && (
                        <span className="mt-2 rounded-full bg-[var(--foam)] px-2 py-0.5 text-xs text-[var(--sea-ink-soft)]">
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
