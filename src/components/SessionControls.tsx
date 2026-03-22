import { useState } from "react";
import { useIntegrationStatus } from "#/hooks/useIntegrationStatus";
import { useGitHubRepos } from "#/hooks/useGitHubRepos";
import type { AiProviderId } from "#/lib/providers/types";

const PROVIDER_LABELS: Record<AiProviderId, string> = {
  claude: "Claude",
  openai: "ChatGPT",
  groq: "Groq",
};

interface SessionControlsProps {
  isRunning: boolean;
  canStart: boolean;
  activeCardCount?: number;
  source?: "trello" | "github" | "gitlab";
  onStart: (opts: {
    cwd: string;
    userMessage?: string;
    mode: "sequential" | "parallel";
    concurrency: number;
    providerId: AiProviderId;
    webMode?: boolean;
    linkedRepo?: { owner: string; repo: string };
  }) => void;
  onStop: () => void;
  runningLabel?: string;
}

export function SessionControls({
  isRunning,
  canStart,
  activeCardCount,
  source = "trello",
  onStart,
  onStop,
  runningLabel,
}: SessionControlsProps) {
  const { configuredProviders, githubLinked } = useIntegrationStatus();

  const isGitSource = source === "github" || source === "gitlab";
  const isDeployed = typeof window !== "undefined" &&
    !window.location.hostname.startsWith("localhost") &&
    !window.location.hostname.startsWith("127.0.0.1");
  const [webMode, setWebMode] = useState(isGitSource || isDeployed);
  const [cwd, setCwd] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [mode, setMode] = useState<"sequential" | "parallel">("sequential");
  const [concurrency, setConcurrency] = useState(3);
  const [providerId, setProviderId] = useState<AiProviderId>(
    configuredProviders[0] ?? "claude",
  );
  const [linkedRepoKey, setLinkedRepoKey] = useState("");

  // Fetch GitHub repos for Trello linking (only when Trello source + GitHub connected)
  const showRepoLinker = source === "trello" && githubLinked;
  const { data: repos } = useGitHubRepos();
  const linkedRepo = linkedRepoKey
    ? { owner: linkedRepoKey.split("/")[0], repo: linkedRepoKey.split("/")[1] }
    : undefined;

  function handleStart() {
    if (!webMode && !cwd.trim()) return;
    onStart({
      cwd: webMode ? "" : cwd.trim(),
      userMessage: initialMessage.trim() || undefined,
      mode: webMode ? "sequential" : mode,
      concurrency,
      providerId,
      webMode,
      linkedRepo,
    });
  }

  return (
    <div className="sticky top-0 z-40 -mx-4 bg-[var(--sand)] px-4 py-3">
      <div className="island-shell flex flex-col gap-3 rounded-xl p-4">
        {/* Web mode banner */}
        {webMode && source === "trello" && !linkedRepo && !isRunning && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            No repository linked — the AI can only suggest code changes.
            {githubLinked
              ? " Link a GitHub repo below for full file editing."
              : " Connect GitHub in Settings to link a repo."}
          </div>
        )}

        {webMode && source === "trello" && linkedRepo && !isRunning && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
            Linked to {linkedRepo.owner}/{linkedRepo.repo} — changes will be
            committed via GitHub API to a new branch
          </div>
        )}

        {webMode && isGitSource && !isRunning && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
            Cloud mode — changes will be committed via{" "}
            {source === "github" ? "GitHub" : "GitLab"} API to a new branch
          </div>
        )}

        {/* Link a GitHub repo to Trello (cloud mode) */}
        {showRepoLinker && webMode && !isRunning && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="linked-repo"
              className="text-xs font-medium text-[var(--sea-ink-soft)]"
            >
              Repository:
            </label>
            <select
              id="linked-repo"
              value={linkedRepoKey}
              onChange={(e) => setLinkedRepoKey(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--shore-line)] bg-white px-2 py-1.5 text-xs text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)] dark:bg-[#1e1e1e] dark:text-[#e0e0e0]"
            >
              <option value="">None (advisory only)</option>
              {repos?.map((r) => (
                <option key={r.full_name} value={r.full_name}>
                  {r.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-end gap-3">
          {!webMode && (
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
          )}

          {!isRunning && (
            <div className={webMode ? "flex-1" : "flex-1"}>
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
                placeholder='e.g. "Focus on the API issues first"'
                rows={2}
                className="w-full resize-none rounded-lg border border-[var(--shore-line)] bg-white/60 px-3 py-2 text-sm text-[var(--sea-ink)] outline-none transition focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[var(--lagoon)]/20 dark:bg-white/5"
              />
            </div>
          )}

          {isRunning ? (
            <button
              onClick={onStop}
              className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Stop Session
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={!canStart || (!webMode && !cwd.trim())}
              className="shrink-0 rounded-lg bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Start Session
            </button>
          )}
        </div>

        {/* Provider + Mode toggle + concurrency + web mode */}
        {!isRunning && (
          <div className="flex flex-wrap items-center gap-4">
            {/* Provider selector */}
            {configuredProviders.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--sea-ink-soft)]">AI:</span>
                <select
                  value={providerId}
                  onChange={(e) =>
                    setProviderId(e.target.value as AiProviderId)
                  }
                  className="rounded-lg border border-[var(--shore-line)] bg-white px-2 py-1 text-xs text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)] dark:bg-[#1e1e1e] dark:text-[#e0e0e0]"
                >
                  {configuredProviders.map((p) => (
                    <option key={p} value={p}>
                      {PROVIDER_LABELS[p] ?? p}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Web / Local toggle — only show when running locally */}
            {!isDeployed && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--sea-ink-soft)]">Env:</span>
              <div className="inline-flex rounded-lg border border-[var(--shore-line)] p-0.5">
                <button
                  onClick={() => setWebMode(false)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    !webMode
                      ? "bg-[var(--lagoon)] text-white"
                      : "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
                  }`}
                >
                  Local
                </button>
                <button
                  onClick={() => setWebMode(true)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    webMode
                      ? "bg-[var(--lagoon)] text-white"
                      : "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
                  }`}
                >
                  Cloud
                </button>
              </div>
            </div>
            )}

            {!webMode && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--sea-ink-soft)]">
                  Mode:
                </span>
                <div className="inline-flex rounded-lg border border-[var(--shore-line)] p-0.5">
                  <button
                    onClick={() => setMode("sequential")}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      mode === "sequential"
                        ? "bg-[var(--lagoon)] text-white"
                        : "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
                    }`}
                  >
                    Sequential
                  </button>
                  <button
                    onClick={() => setMode("parallel")}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      mode === "parallel"
                        ? "bg-[var(--lagoon)] text-white"
                        : "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
                    }`}
                  >
                    Parallel
                  </button>
                </div>
              </div>
            )}

            {!webMode && mode === "parallel" && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="concurrency"
                  className="text-xs text-[var(--sea-ink-soft)]"
                >
                  Concurrency:
                </label>
                <input
                  id="concurrency"
                  type="range"
                  min={1}
                  max={5}
                  value={concurrency}
                  onChange={(e) => setConcurrency(Number(e.target.value))}
                  className="h-1.5 w-20 accent-[var(--lagoon)]"
                />
                <span className="w-4 text-center text-xs font-medium text-[var(--sea-ink)]">
                  {concurrency}
                </span>
              </div>
            )}

            {!webMode &&
              mode === "parallel" &&
              activeCardCount !== undefined &&
              activeCardCount > 0 && (
                <span className="text-xs text-[var(--sea-ink-soft)]">
                  {activeCardCount} item
                  {activeCardCount !== 1 ? "s" : ""} will each get their own
                  agent
                </span>
              )}
          </div>
        )}

        {isRunning && (
          <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            {runningLabel ?? "Session running"}
          </p>
        )}
      </div>
    </div>
  );
}
