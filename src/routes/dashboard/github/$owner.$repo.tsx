import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { useGitHubIssues } from "#/hooks/useGitHubIssues";
import { useClaudeSession } from "#/hooks/useClaudeSession";
import { useParallelSession } from "#/hooks/useParallelSession";
import { SessionControls } from "#/components/SessionControls";
import { SessionLog } from "#/components/SessionLog";
import { ParallelSessionView } from "#/components/ParallelSessionView";
import { PageSkeleton } from "#/components/PageSkeleton";
import type { GitHubIssueWithTasks } from "#/hooks/useGitHubIssues";

export const Route = createFileRoute("/dashboard/github/$owner/$repo")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
    return { user: session.user };
  },
  component: GitHubRepoPage,
  pendingComponent: PageSkeleton,
});

function IssueItem({ 
  issue, 
  onWorkOnThis, 
  isSessionRunning 
}: { 
  issue: GitHubIssueWithTasks;
  onWorkOnThis?: (issue: GitHubIssueWithTasks) => void;
  isSessionRunning?: boolean;
}) {
  const totalTasks = issue.tasks.length;
  const doneTasks = issue.tasks.filter((t) => t.checked).length;

  return (
    <div className="island-shell rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--sea-ink)]">
            #{issue.number} {issue.title}
          </h3>
          {issue.labels.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {issue.labels.map((label) => (
                <span
                  key={label.name}
                  className="rounded-full bg-[var(--foam)] px-2 py-0.5 text-xs text-[var(--sea-ink-soft)]"
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onWorkOnThis && (
            <button
              onClick={() => onWorkOnThis(issue)}
              disabled={isSessionRunning}
              className="shrink-0 rounded-md bg-[var(--lagoon)] px-2 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              title={isSessionRunning ? "Stop current session first" : "Work on this issue only"}
            >
              Work on this
            </button>
          )}
          {totalTasks > 0 && (
            <span className="shrink-0 text-xs text-[var(--sea-ink-soft)]">
              {doneTasks}/{totalTasks} tasks
            </span>
          )}
        </div>
      </div>
      {totalTasks > 0 && (
        <div className="mt-3 space-y-1">
          {issue.tasks.map((task) => (
            <div
              key={task.index}
              className="flex items-center gap-2 text-sm text-[var(--sea-ink-soft)]"
            >
              <span
                className={
                  task.checked
                    ? "text-green-600 dark:text-green-400"
                    : "text-[var(--shore-line)]"
                }
              >
                {task.checked ? "\u2713" : "\u25CB"}
              </span>
              <span className={task.checked ? "line-through opacity-60" : ""}>
                {task.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GitHubRepoPage() {
  const { owner, repo } = Route.useParams();
  const boardKey = `github:${owner}/${repo}`;
  const sequential = useClaudeSession(boardKey);
  const parallel = useParallelSession(boardKey);
  const isRunning = sequential.isRunning || parallel.isRunning;

  const { data: issues, isLoading, error } = useGitHubIssues(
    owner,
    repo,
    isRunning,
  );

  const activeIssues = issues?.filter((i) => i.state === "open") ?? [];

  const handleWorkOnThis = (issue: GitHubIssueWithTasks) => {
    // Only include this single issue that has at least one incomplete task
    const hasIncompleteTask = issue.tasks.some((t) => !t.checked);
    if (!hasIncompleteTask) return;

    const singleIssueBoardData = {
      board: { id: `${owner}/${repo}`, name: `${owner}/${repo}` },
      cards: [{
        id: String(issue.number),
        name: issue.title,
        desc: issue.body ?? "",
        checklists: issue.tasks.length > 0
          ? [
              {
                id: "tasks",
                name: "Tasks",
                checkItems: issue.tasks.map((t) => ({
                  id: `task-${t.index}`,
                  name: t.text,
                  state: t.checked ? "complete" : "incomplete",
                })),
              },
            ]
          : [],
      }],
    };

    const opts = {
      providerId: "claude" as const,
      source: "github" as const,
      githubOwner: owner,
      githubRepo: repo,
      webMode: true,
    };

    sequential.start(singleIssueBoardData, "", undefined, opts);
  };

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="mb-4">
          <Link
            to="/dashboard/github"
            className="text-sm text-[var(--lagoon)] hover:underline"
          >
            &larr; All repos
          </Link>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-[var(--sea-ink)]">
          {owner}/{repo}
        </h1>
        <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
          {activeIssues.length} open issue{activeIssues.length === 1 ? "" : "s"}{" "}
          with task lists
        </p>

        <SessionControls
          isRunning={isRunning}
          canStart={activeIssues.length > 0}
          activeCardCount={activeIssues.length}
          source="github"
          runningLabel={
            sequential.isRunning
              ? "Session running"
              : `Parallel session running (${parallel.agents.size} agents)`
          }
          onStart={({ cwd, userMessage, mode, concurrency, providerId, webMode }) => {
            // Only include issues that have at least one incomplete task
            const issuesWithWork = activeIssues.filter(
              (issue) => issue.tasks.some((t) => !t.checked),
            );

            const boardData = {
              board: { id: `${owner}/${repo}`, name: `${owner}/${repo}` },
              cards: issuesWithWork.map((issue) => ({
                id: String(issue.number),
                name: issue.title,
                desc: issue.body ?? "",
                checklists: issue.tasks.length > 0
                  ? [
                      {
                        id: "tasks",
                        name: "Tasks",
                        checkItems: issue.tasks.map((t) => ({
                          id: `task-${t.index}`,
                          name: t.text,
                          state: t.checked ? "complete" : "incomplete",
                        })),
                      },
                    ]
                  : [],
              })),
            };

            const opts = {
              providerId,
              source: "github" as const,
              githubOwner: owner,
              githubRepo: repo,
              webMode,
            };

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

        {isLoading && (
          <div className="space-y-2">
            {["skeleton-1", "skeleton-2", "skeleton-3"].map((id) => (
              <div
                key={id}
                className="h-20 animate-pulse rounded-xl bg-[var(--foam)]"
              />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load issues: {error.message}
          </p>
        )}

        {activeIssues.length === 0 && !isLoading && (
          <div className="island-shell rounded-2xl p-8 text-center">
            <p className="text-sm text-[var(--sea-ink-soft)]">
              No open issues found in this repo.
            </p>
          </div>
        )}

        {activeIssues.length > 0 && (
          <div className="space-y-3">
            {activeIssues.map((issue) => (
              <IssueItem key={issue.number} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
