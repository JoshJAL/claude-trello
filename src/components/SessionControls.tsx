import { useReducer } from "react";
import { useIntegrationStatus } from "#/hooks/useIntegrationStatus";
import { useGitHubRepos } from "#/hooks/useGitHubRepos";
import { useGitLabProjects } from "#/hooks/useGitLabProjects";
import { useBranches } from "#/hooks/useBranches";
import type { AiProviderId } from "#/lib/providers/types";
import { WebModeBanner } from "./session/WebModeBanner";
import { BranchSelector } from "./session/BranchSelector";
import { WorkspaceTypePicker } from "./session/WorkspaceTypePicker";
import { SessionToolbar } from "./session/SessionToolbar";

interface SessionControlsProps {
  isRunning: boolean;
  canStart: boolean;
  activeCardCount?: number;
  source?: "trello" | "github" | "gitlab";
  /** GitHub owner for branch fetching (GitHub source pages) */
  githubOwner?: string;
  /** GitHub repo for branch fetching (GitHub source pages) */
  githubRepo?: string;
  /** GitLab project ID for branch fetching (GitLab source pages) */
  gitlabProjectId?: number;
  onStart: (opts: {
    cwd: string;
    userMessage?: string;
    mode: "sequential" | "parallel";
    concurrency: number;
    providerId: AiProviderId;
    webMode?: boolean;
    linkedRepo?: { owner: string; repo: string };
    linkedGitlabProjectId?: number;
    selectedBranch?: string;
    linkedWorkspace?: { provider: "google" | "onedrive"; folderId: string };
  }) => void;
  onStop: () => void;
  runningLabel?: string;
  /** Called when the user changes the selected AI provider */
  onProviderSelect?: (providerId: AiProviderId) => void;
}

interface ControlsState {
  webMode: boolean;
  cwd: string;
  initialMessage: string;
  mode: "sequential" | "parallel";
  concurrency: number;
  providerId: AiProviderId;
  linkedRepoKey: string;
  selectedBranch: string;
  workspaceKey: string;
}

type ControlsAction =
  | { type: "SET_WEB_MODE"; value: boolean }
  | { type: "SET_CWD"; value: string }
  | { type: "SET_MESSAGE"; value: string }
  | { type: "SET_MODE"; value: "sequential" | "parallel" }
  | { type: "SET_CONCURRENCY"; value: number }
  | { type: "SET_PROVIDER"; value: AiProviderId }
  | { type: "SET_LINKED_REPO"; value: string }
  | { type: "SET_BRANCH"; value: string }
  | { type: "SET_WORKSPACE"; value: string };

function controlsReducer(state: ControlsState, action: ControlsAction): ControlsState {
  switch (action.type) {
    case "SET_WEB_MODE":
      return { ...state, webMode: action.value };
    case "SET_CWD":
      return { ...state, cwd: action.value };
    case "SET_MESSAGE":
      return { ...state, initialMessage: action.value };
    case "SET_MODE":
      return { ...state, mode: action.value };
    case "SET_CONCURRENCY":
      return { ...state, concurrency: action.value };
    case "SET_PROVIDER":
      return { ...state, providerId: action.value };
    case "SET_LINKED_REPO":
      return { ...state, linkedRepoKey: action.value, selectedBranch: "" };
    case "SET_BRANCH":
      return { ...state, selectedBranch: action.value };
    case "SET_WORKSPACE":
      return { ...state, workspaceKey: action.value, selectedBranch: "" };
  }
}

export function SessionControls({
  isRunning,
  canStart,
  activeCardCount,
  source = "trello",
  githubOwner: propsGithubOwner,
  githubRepo: propsGithubRepo,
  gitlabProjectId: propsGitlabProjectId,
  onStart,
  onStop,
  runningLabel,
  onProviderSelect,
}: SessionControlsProps) {
  const { configuredProviders, githubLinked, gitlabLinked, googleDriveLinked, oneDriveLinked } = useIntegrationStatus();

  const isGitSource = source === "github" || source === "gitlab";
  const isDeployed =
    typeof window !== "undefined" &&
    !window.location.hostname.startsWith("localhost") &&
    !window.location.hostname.startsWith("127.0.0.1");

  const [state, dispatch] = useReducer(controlsReducer, {
    webMode: isGitSource || isDeployed,
    cwd: "",
    initialMessage: "",
    mode: "sequential" as const,
    concurrency: 3,
    providerId: configuredProviders[0] ?? "claude",
    linkedRepoKey: "",
    selectedBranch: "",
    workspaceKey: "",
  });

  const hasAnyWorkspace = githubLinked || gitlabLinked || googleDriveLinked || oneDriveLinked;
  const showWorkspacePicker = source === "trello" && hasAnyWorkspace;
  const { data: ghRepos } = useGitHubRepos(showWorkspacePicker && githubLinked);
  const { data: glProjects } = useGitLabProjects(showWorkspacePicker && gitlabLinked);

  // Derive linked repo / workspace from the unified workspace key
  const linkedRepo = state.workspaceKey.startsWith("github:")
    ? {
        owner: state.workspaceKey.slice(7).split("/")[0],
        repo: state.workspaceKey.slice(7).split("/")[1],
      }
    : undefined;
  const linkedGitlabProjectId = state.workspaceKey.startsWith("gitlab:")
    ? Number(state.workspaceKey.slice(7))
    : undefined;

  // Determine branch query params — prefer props (GitHub/GitLab pages), fall back to linked repo (Trello)
  const effectiveOwner = propsGithubOwner ?? linkedRepo?.owner;
  const effectiveRepo = propsGithubRepo ?? linkedRepo?.repo;
  const effectiveProjectId = propsGitlabProjectId ?? linkedGitlabProjectId;
  const branchSource: "github" | "gitlab" | "trello" =
    effectiveOwner && effectiveRepo ? "github" : effectiveProjectId ? "gitlab" : "trello";

  const showBranchSelector = state.webMode && (branchSource === "github" || branchSource === "gitlab");

  const { data: branches, isLoading: branchesLoading } = useBranches(
    branchSource,
    effectiveOwner,
    effectiveRepo,
    effectiveProjectId,
    showBranchSelector,
  );

  // Workspace: cloud storage folder (Google Drive or OneDrive)
  const linkedWorkspace = state.workspaceKey.startsWith("google:") || state.workspaceKey.startsWith("onedrive:")
    ? {
        provider: state.workspaceKey.split(":")[0] as "google" | "onedrive",
        folderId: state.workspaceKey.split(":").slice(1).join(":"),
      }
    : undefined;

  function handleStart() {
    if (!state.webMode && !state.cwd.trim()) return;
    onStart({
      cwd: state.webMode ? "" : state.cwd.trim(),
      userMessage: state.initialMessage.trim() || undefined,
      mode: state.webMode ? "sequential" : state.mode,
      concurrency: state.concurrency,
      providerId: state.providerId,
      webMode: state.webMode,
      linkedRepo,
      linkedGitlabProjectId,
      selectedBranch: state.selectedBranch || undefined,
      linkedWorkspace,
    });
  }

  return (
    <div className="sticky top-0 z-40 -mx-4 bg-(--sand) px-4 py-3">
      <div className="island-shell flex flex-col gap-3 rounded-xl p-4">
        {state.webMode && !isRunning && (
          <WebModeBanner
            source={source}
            linkedRepo={linkedRepo}
            linkedGitlabProjectId={linkedGitlabProjectId}
            githubLinked={githubLinked}
            gitlabLinked={gitlabLinked}
          />
        )}

        {showWorkspacePicker && state.webMode && !isRunning && (
          <WorkspaceTypePicker
            workspaceKey={state.workspaceKey}
            onWorkspaceKeyChange={(v) => dispatch({ type: "SET_WORKSPACE", value: v })}
            githubLinked={githubLinked}
            gitlabLinked={gitlabLinked}
            googleDriveLinked={googleDriveLinked}
            oneDriveLinked={oneDriveLinked}
            ghRepos={ghRepos}
            glProjects={glProjects}
          />
        )}

        {showBranchSelector && !isRunning && (
          <BranchSelector
            branches={branches ?? []}
            selectedBranch={state.selectedBranch}
            onBranchChange={(v) => dispatch({ type: "SET_BRANCH", value: v })}
            isLoading={branchesLoading}
          />
        )}

        <div className="flex items-end gap-3">
          {!state.webMode && (
            <div className="flex-1">
              <label htmlFor="cwd" className="mb-1 block text-xs font-medium text-(--sea-ink-soft)">
                Project directory
              </label>
              <input
                id="cwd"
                type="text"
                value={state.cwd}
                onChange={(e) => dispatch({ type: "SET_CWD", value: e.target.value })}
                disabled={isRunning}
                placeholder="/home/user/my-project"
                className="w-full rounded-lg border border-(--shore-line) bg-white/60 px-3 py-2 text-sm text-(--sea-ink) outline-none transition focus:border-(--lagoon) focus:ring-2 focus:ring-(--lagoon)/20 disabled:opacity-50 dark:bg-white/5"
              />
            </div>
          )}

          {!isRunning && (
            <div className="flex-1">
              <label htmlFor="initial-message" className="mb-1 block text-xs font-medium text-(--sea-ink-soft)">
                Initial instructions{" "}
                <span className="font-normal text-(--shore-line)">(optional)</span>
              </label>
              <textarea
                id="initial-message"
                value={state.initialMessage}
                onChange={(e) => dispatch({ type: "SET_MESSAGE", value: e.target.value })}
                placeholder='e.g. "Focus on the API issues first"'
                rows={2}
                className="w-full resize-none rounded-lg border border-(--shore-line) bg-white/60 px-3 py-2 text-sm text-(--sea-ink) outline-none transition focus:border-(--lagoon) focus:ring-2 focus:ring-(--lagoon)/20 dark:bg-white/5"
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
              disabled={!canStart || (!state.webMode && !state.cwd.trim())}
              className="shrink-0 rounded-lg bg-(--lagoon) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Start Session
            </button>
          )}
        </div>

        {!isRunning && (
          <SessionToolbar
            configuredProviders={configuredProviders}
            providerId={state.providerId}
            onProviderChange={(v) => { dispatch({ type: "SET_PROVIDER", value: v }); onProviderSelect?.(v); }}
            isDeployed={isDeployed}
            webMode={state.webMode}
            onWebModeChange={(v) => dispatch({ type: "SET_WEB_MODE", value: v })}
            mode={state.mode}
            onModeChange={(v) => dispatch({ type: "SET_MODE", value: v })}
            concurrency={state.concurrency}
            onConcurrencyChange={(v) => dispatch({ type: "SET_CONCURRENCY", value: v })}
            activeCardCount={activeCardCount}
          />
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
