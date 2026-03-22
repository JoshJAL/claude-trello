import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { useGitLabProjects } from "#/hooks/useGitLabProjects";
import { useIntegrationStatus } from "#/hooks/useIntegrationStatus";
import { useSearchFilter } from "#/hooks/useSearchFilter";
import { PageSkeleton } from "#/components/PageSkeleton";

export const Route = createFileRoute("/dashboard/gitlab/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
    return { user: session.user };
  },
  component: GitLabDashboardPage,
  pendingComponent: PageSkeleton,
});

function GitLabDashboardPage() {
  const { user } = Route.useRouteContext();
  const { gitlabLinked } = useIntegrationStatus();
  const { data: projects, isLoading, error } = useGitLabProjects();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const filteredProjects = projects
    ? projects.filter((project) => {
        const query = q.toLowerCase();
        return (
          project.path_with_namespace.toLowerCase().includes(query) ||
          (project.description ?? "").toLowerCase().includes(query)
        );
      })
    : [];

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="island-shell rounded-2xl p-8">
          <h1 className="mb-2 text-2xl font-bold text-[var(--sea-ink)]">
            GitLab Projects
          </h1>
          <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
            Welcome back, {user.name}. Select a GitLab project to work on its
            issues.
          </p>

          {!gitlabLinked && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                You haven&apos;t connected GitLab yet.{" "}
                <Link
                  to="/settings"
                  className="font-semibold text-[var(--lagoon)] hover:underline"
                >
                  Connect it in Settings
                </Link>{" "}
                to see your projects here.
              </p>
            </div>
          )}

          {gitlabLinked && isLoading && (
            <div className="space-y-2">
              {["skeleton-1", "skeleton-2", "skeleton-3"].map((id) => (
                <div
                  key={id}
                  className="h-14 animate-pulse rounded-xl bg-[var(--foam)]"
                />
              ))}
            </div>
          )}

          {gitlabLinked && error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load projects: {error.message}
            </p>
          )}

          {gitlabLinked && projects && projects.length === 0 && (
            <p className="text-sm text-[var(--sea-ink-soft)]">
              No projects found. Make sure your GitLab account has accessible
              projects.
            </p>
          )}

          {gitlabLinked && projects && projects.length > 0 && (
            <>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search projects…"
                className="mb-4 w-full rounded-xl border border-[var(--shore-line)] bg-white/60 px-4 py-2 text-sm text-[var(--sea-ink)] placeholder-[var(--sea-ink-soft)] outline-none focus:border-[var(--lagoon)] dark:bg-white/5"
              />

              {filteredProjects.length === 0 ? (
                <p className="text-sm text-[var(--sea-ink-soft)]">
                  No results for &ldquo;{q}&rdquo;.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() =>
                        navigate({
                          to: "/dashboard/gitlab/$projectId",
                          params: {
                            projectId: String(project.id),
                          },
                        })
                      }
                      className="flex flex-col items-start rounded-xl border border-[var(--shore-line)] bg-white/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--lagoon)] hover:shadow-md dark:bg-white/5"
                    >
                      <span className="text-sm font-semibold text-[var(--sea-ink)]">
                        {project.path_with_namespace}
                      </span>
                      {project.description && (
                        <span className="mt-1 line-clamp-2 text-xs text-[var(--sea-ink-soft)]">
                          {project.description}
                        </span>
                      )}
                      {project.visibility !== "public" && (
                        <span className="mt-2 rounded-full bg-[var(--foam)] px-2 py-0.5 text-xs text-[var(--sea-ink-soft)]">
                          {project.visibility === "private" ? "Private" : "Internal"}
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
