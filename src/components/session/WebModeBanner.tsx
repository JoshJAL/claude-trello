interface WebModeBannerProps {
  source: "trello" | "github" | "gitlab";
  linkedRepo?: { owner: string; repo: string };
  linkedGitlabProjectId?: number;
  githubLinked: boolean;
  gitlabLinked: boolean;
}

export function WebModeBanner({
  source,
  linkedRepo,
  linkedGitlabProjectId,
  githubLinked,
  gitlabLinked,
}: WebModeBannerProps) {
  const isGitSource = source === "github" || source === "gitlab";

  if (source === "trello" && !linkedRepo && !linkedGitlabProjectId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
        No repository linked — the AI can only suggest code changes.
        {githubLinked || gitlabLinked
          ? " Link a repo below for full file editing."
          : " Connect GitHub or GitLab in Settings to link a repo."}
      </div>
    );
  }

  if (source === "trello" && linkedRepo) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
        Linked to {linkedRepo.owner}/{linkedRepo.repo} — changes via GitHub API
      </div>
    );
  }

  if (source === "trello" && linkedGitlabProjectId) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
        Linked to GitLab project #{linkedGitlabProjectId} — changes via GitLab API
      </div>
    );
  }

  if (isGitSource) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
        Cloud mode — changes will be committed via{" "}
        {source === "github" ? "GitHub" : "GitLab"} API to a new branch
      </div>
    );
  }

  return null;
}
