/**
 * CLI PR/MR creation utilities.
 * Creates pull requests / merge requests after a session completes.
 */

import type { BoardData, Credentials } from "./types.js";

export interface CliPrParams {
  source: "trello" | "github" | "gitlab";
  credentials: Credentials;
  boardData: BoardData;
  durationMs: number;
  providerName: string;
  mode: "sequential" | "parallel";
  branch?: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabProjectId?: number;
}

export interface CliPrResult {
  url: string;
  number: number;
  title: string;
  draft: boolean;
}

/**
 * Count completed and total tasks from BoardData.
 */
function countTasks(boardData: BoardData): {
  completed: number;
  total: number;
} {
  let completed = 0;
  let total = 0;
  for (const card of boardData.cards) {
    for (const cl of card.checklists) {
      for (const item of cl.checkItems) {
        total++;
        if (item.state === "complete") completed++;
      }
    }
  }
  return { completed, total };
}

/**
 * Extract issue numbers from board data cards (for GitHub/GitLab sources).
 */
function extractIssueNumbers(boardData: BoardData): number[] {
  return boardData.cards
    .map((card) => {
      const num = Number(card.id);
      return Number.isFinite(num) && num > 0 ? num : null;
    })
    .filter((n): n is number => n !== null);
}

/**
 * Generate PR body from session data.
 */
function generatePrBody(params: {
  source: string;
  boardName: string;
  tasksCompleted: number;
  tasksTotal: number;
  providerName: string;
  mode: string;
  durationMs: number;
  issueNumbers?: number[];
}): string {
  const sourceLabel =
    params.source === "trello"
      ? "Trello"
      : params.source === "github"
        ? "GitHub"
        : "GitLab";

  const durationSec = Math.round(params.durationMs / 1000);
  const durationStr =
    durationSec >= 60
      ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
      : `${durationSec}s`;

  let body = `## Summary\n\nAI-generated changes from TaskPilot CLI session.\n\n`;

  if (params.issueNumbers && params.issueNumbers.length > 0) {
    body += params.issueNumbers.map((n) => `Closes #${n}`).join("\n") + "\n\n";
  }

  body += `## Task Source\n\n`;
  body += `- **Source**: ${sourceLabel}\n`;
  body += `- **Board/Repo**: ${params.boardName}\n`;
  body += `- **Tasks completed**: ${params.tasksCompleted}/${params.tasksTotal}\n\n`;

  body += `## Session Details\n\n`;
  body += `- **Provider**: ${params.providerName}\n`;
  body += `- **Mode**: ${params.mode}\n`;
  body += `- **Duration**: ${durationStr}\n\n`;

  body += `---\n`;
  body += `*Created by [TaskPilot](https://github.com/JoshJAL/taskpilot)*\n`;

  return body;
}

/**
 * Create a pull request on GitHub.
 */
async function createGitHubPr(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string,
  draft: boolean,
): Promise<{ number: number; html_url: string }> {
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body, head, base, draft }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `GitHub API error: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`,
    );
  }

  return res.json() as Promise<{ number: number; html_url: string }>;
}

/**
 * Create a merge request on GitLab.
 */
async function createGitLabMr(
  token: string,
  projectId: number,
  title: string,
  description: string,
  sourceBranch: string,
  targetBranch: string,
  draft: boolean,
): Promise<{ iid: number; web_url: string }> {
  const mrTitle = draft ? `Draft: ${title}` : title;
  const res = await fetch(
    `https://gitlab.com/api/v4/projects/${projectId}/merge_requests`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: mrTitle,
        description,
        source_branch: sourceBranch,
        target_branch: targetBranch,
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `GitLab API error: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`,
    );
  }

  return res.json() as Promise<{ iid: number; web_url: string }>;
}

/**
 * Get the current git branch name.
 */
async function getCurrentBranch(cwd: string): Promise<string | null> {
  try {
    const { execSync } = await import("child_process");
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf8",
    }).trim();
    return branch && branch !== "HEAD" ? branch : null;
  } catch {
    return null;
  }
}

/**
 * Attempt to create a PR/MR after a CLI session completes.
 * Best-effort: returns null if anything goes wrong.
 */
export async function attemptCliPrCreation(
  params: CliPrParams,
): Promise<CliPrResult | null> {
  try {
    const { source, credentials, boardData, durationMs, providerName, mode } =
      params;

    const { completed, total } = countTasks(boardData);
    const issueNumbers = extractIssueNumbers(boardData);
    const boardName = boardData.board.name;
    const firstCardTitle = boardData.cards[0]?.name ?? "tasks";
    const prTitle = `[TaskPilot] ${firstCardTitle}${boardData.cards.length > 1 ? ` (+${boardData.cards.length - 1} more)` : ""}`;

    // Determine which platform to create the PR on
    if (
      source === "github" &&
      params.githubOwner &&
      params.githubRepo &&
      credentials.githubToken
    ) {
      const branch =
        params.branch ?? (await getCurrentBranch(process.cwd())) ?? "main";

      if (branch === "main" || branch === "master") {
        // Don't create PR from main/master
        return null;
      }

      const prBody = generatePrBody({
        source,
        boardName,
        tasksCompleted: completed,
        tasksTotal: total,
        providerName,
        mode,
        durationMs,
        issueNumbers,
      });

      const pr = await createGitHubPr(
        credentials.githubToken,
        params.githubOwner,
        params.githubRepo,
        prTitle,
        prBody,
        branch,
        "main",
        true, // CLI always creates as draft for safety
      );

      return {
        url: pr.html_url,
        number: pr.number,
        title: prTitle,
        draft: true,
      };
    }

    if (
      source === "gitlab" &&
      params.gitlabProjectId &&
      credentials.gitlabToken
    ) {
      const branch =
        params.branch ?? (await getCurrentBranch(process.cwd())) ?? "main";

      if (branch === "main" || branch === "master") {
        return null;
      }

      const prBody = generatePrBody({
        source,
        boardName,
        tasksCompleted: completed,
        tasksTotal: total,
        providerName,
        mode,
        durationMs,
      });

      const mr = await createGitLabMr(
        credentials.gitlabToken,
        params.gitlabProjectId,
        prTitle,
        prBody,
        branch,
        "main",
        true,
      );

      return {
        url: mr.web_url,
        number: mr.iid,
        title: prTitle,
        draft: true,
      };
    }

    return null;
  } catch (err) {
    // Best-effort: log but don't fail
    console.error(
      `[PR Automation] Failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
    return null;
  }
}
