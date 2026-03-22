import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { useGitLabIssues } from "#/hooks/useGitLabIssues";
import { useClaudeSession } from "#/hooks/useClaudeSession";
import { useParallelSession } from "#/hooks/useParallelSession";
import { SessionControls } from "#/components/SessionControls";
import { SessionLog } from "#/components/SessionLog";
import { ParallelSessionView } from "#/components/ParallelSessionView";
import { PrResultBanner } from "#/components/PrResultBanner";
import { PageSkeleton } from "#/components/PageSkeleton";
import { useIntegrationStatus } from "#/hooks/useIntegrationStatus";
import { PROVIDER_SHORT_LABELS } from "#/lib/providers/types";
import type { AiProviderId } from "#/lib/providers/types";
import type { GitLabIssueWithTasks } from "#/hooks/useGitLabIssues";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/gitlab/$projectId")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
    return { user: session.user };
  },
  component: GitLabProjectPage,
  pendingComponent: PageSkeleton,
});

function IssueItem({ 
  issue, 
  onWorkOnThis, 
  isSessionRunning 
}: { 
  issue: GitLabIssueWithTasks;
  onWorkOnThis?: (issue: GitLabIssueWithTasks) => void;
  isSessionRunning?: boolean;
}) {
  const totalTasks = issue.tasks.length;
  const doneTasks = issue.tasks.filter((t) => t.checked).length;
  const hasIncompleteTask = issue.tasks.some((t) => !t.checked);

  return (
    <div className="island-shell rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-(--sea-ink)">
            #{issue.iid} {issue.title}
          </h3>
          {issue.labels.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {issue.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-(--foam) px-2 py-0.5 text-xs text-(--sea-ink-soft)"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onWorkOnThis && hasIncompleteTask && (
            <button
              onClick={() => onWorkOnThis(issue)}
              disabled={isSessionRunning}
              className="shrink-0 rounded-md bg-(--lagoon) px-2 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              title={isSessionRunning ? "Stop current session first" : "Work on this issue only"}
            >
              Work on this
            </button>
          )}
          {totalTasks > 0 && (
            <span className="shrink-0 text-xs text-(--sea-ink-soft)">
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
              className="flex items-center gap-2 text-sm text-(--sea-ink-soft)"
            >
              <span
                className={
                  task.checked
                    ? "text-green-600 dark:text-green-400"
                    : "text-(--shore-line)"
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

function GitLabProjectPage() {
  const { projectId } = Route.useParams();
  const { configuredProviders } = useIntegrationStatus();
  const defaultProvider = configuredProviders[0] ?? "claude";
  const [selectedProvider, setSelectedProvider] = useState<AiProviderId>(defaultProvider);
  const numericProjectId = Number(projectId);
  const boardKey = `gitlab:${projectId}`;
  const sequential = useClaudeSession(boardKey);
  const parallel = useParallelSession(boardKey);
  const isRunning = sequential.isRunning || parallel.isRunning;

  const { data: issues, isLoading, error } = useGitLabIssues(
    numericProjectId,
    isRunning,
  );

  const activeIssues = issues?.filter((i) => i.state === "opened") ?? [];

  const handleWorkOnThis = (issue: GitLabIssueWithTasks) => {
    // Only include this single issue that has at least one incomplete task
    const hasIncompleteTask = issue.tasks.some((t) => !t.checked);
    if (!hasIncompleteTask) return;

    const singleIssueBoardData = {
      board: { id: projectId, name: `Project #${projectId}` },
      cards: [{
        id: String(issue.iid),
        name: issue.title,
        desc: issue.description ?? "",
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

    // Determine if we're in a deployed environment (cloud mode)
    const isDeployed = typeof window !== "undefined" &&
      !window.location.hostname.startsWith("localhost") &&
      !window.location.hostname.startsWith("127.0.0.1");

    const opts = {
      providerId: selectedProvider,
      source: "gitlab" as const,
      gitlabProjectId: numericProjectId,
      webMode: isDeployed || true, // GitLab always uses cloud mode for remote repos
    };

    sequential.start(singleIssueBoardData, "", undefined, opts);
  };

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="mb-4">
          <Link
            to="/dashboard/gitlab"
            className="text-sm text-(--lagoon) hover:underline"
          >
            &larr; All projects
          </Link>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-(--sea-ink)">
          Project #{projectId}
        </h1>
        <p className="mb-6 text-sm text-(--sea-ink-soft)">
          {activeIssues.length} open issue{activeIssues.length === 1 ? "" : "s"}{" "}
          with task lists
        </p>

        <SessionControls
          isRunning={isRunning}
          canStart={activeIssues.length > 0}
          activeCardCount={activeIssues.length}
          source="gitlab"
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
              board: { id: projectId, name: `Project #${projectId}` },
              cards: issuesWithWork.map((issue) => ({
                id: String(issue.iid),
                name: issue.title,
                desc: issue.description ?? "",
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
              source: "gitlab" as const,
              gitlabProjectId: numericProjectId,
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
          onProviderSelect={setSelectedProvider}
        />

        {(sequential.error || parallel.error) && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            {sequential.error || parallel.error}
          </div>
        )}

        {sequential.prResult && (
          <PrResultBanner prResult={sequential.prResult} />
        )}

        {sequential.isRunning || sequential.logs.length > 0 ? (
          <SessionLog
            logs={sequential.logs}
            isRunning={sequential.isRunning}
            pendingQuestion={sequential.pendingQuestion}
            onSendMessage={sequential.sendMessage}
            providerLabel={PROVIDER_SHORT_LABELS[selectedProvider]}
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
                className="h-20 animate-pulse rounded-xl bg-(--foam)"
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
            <p className="text-sm text-(--sea-ink-soft)">
              No open issues found in this project.
            </p>
          </div>
        )}

        {activeIssues.length > 0 && (
          <div className="space-y-3">
            {activeIssues.map((issue) => (
              <IssueItem 
                key={issue.iid} 
                issue={issue}
                onWorkOnThis={handleWorkOnThis}
                isSessionRunning={isRunning}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
