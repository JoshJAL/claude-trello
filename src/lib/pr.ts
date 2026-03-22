/**
 * PR/MR Automation — Phase 18
 *
 * Unified PR/MR creation for GitHub and GitLab, with template body generation.
 * Used by the session route after an AI session completes, and by the CLI.
 */

import { createPullRequest as ghCreatePR } from "#/lib/github/client";
import { createMergeRequest as glCreateMR } from "#/lib/gitlab/client";
import type { PrResult, PrAutomationConfig, BoardData } from "#/lib/types";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PrCreateParams {
  source: "github" | "gitlab";
  sourceToken: string;
  owner?: string;
  repo?: string;
  projectId?: number;
  title: string;
  body: string;
  head: string;
  base: string;
  draft: boolean;
}

export interface PrBodyParams {
  source: "trello" | "github" | "gitlab";
  boardName: string;
  tasksCompleted: number;
  tasksTotal: number;
  providerName: string;
  mode: "sequential" | "parallel";
  durationMs: number;
  summary?: string;
  issueNumbers?: number[];
  autoLinkIssue?: boolean;
}

// ── PR/MR Creation ─────────────────────────────────────────────────────────

export async function createPr(params: PrCreateParams): Promise<PrResult> {
  if (params.source === "github") {
    if (!params.owner || !params.repo) {
      throw new Error("owner and repo are required for GitHub PRs");
    }

    const pr = await ghCreatePR(
      params.sourceToken,
      params.owner,
      params.repo,
      params.title,
      params.body,
      params.head,
      params.base,
      params.draft,
    );

    return {
      url: pr.html_url,
      number: pr.number,
      title: params.title,
      draft: params.draft,
    };
  }

  if (params.source === "gitlab") {
    if (!params.projectId) {
      throw new Error("projectId is required for GitLab MRs");
    }

    const mr = await glCreateMR(
      params.sourceToken,
      params.projectId,
      params.title,
      params.body,
      params.head,
      params.base,
      params.draft,
    );

    return {
      url: mr.web_url,
      number: mr.iid,
      title: params.title,
      draft: params.draft,
    };
  }

  throw new Error(`Unsupported source for PR creation: ${params.source}`);
}

// ── PR Body Template ───────────────────────────────────────────────────────

export function generatePrBody(params: PrBodyParams): string {
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

  let body = `## Summary\n\n`;

  if (params.summary?.trim()) {
    body += `${params.summary.trim()}\n\n`;
  } else {
    body += `AI-generated changes from TaskPilot session.\n\n`;
  }

  // Auto-link issues with "Closes #N" if enabled
  if (
    params.autoLinkIssue &&
    params.issueNumbers &&
    params.issueNumbers.length > 0
  ) {
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

// ── Branch Name Generation ─────────────────────────────────────────────────

/**
 * Generate a branch name from the automation config pattern.
 * Pattern variables: {source}, {id}, {slug}
 */
export function generateBranchName(
  pattern: string,
  source: string,
  id: string,
  title: string,
): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return pattern
    .replace("{source}", source)
    .replace("{id}", id)
    .replace("{slug}", slug);
}

// ── Trello PR Attachment ───────────────────────────────────────────────────

/**
 * Attach a PR URL to a Trello card and add a comment with the link.
 * Best-effort: errors are caught and logged, not thrown.
 */
export async function attachPrToTrelloCard(
  trelloToken: string,
  cardId: string,
  prUrl: string,
  prTitle: string,
): Promise<void> {
  const TRELLO_BASE = "https://api.trello.com/1";
  const separator = "?";
  const keyToken = `key=${process.env.TRELLO_API_KEY!}&token=${trelloToken}`;

  try {
    // Add URL as attachment
    await fetch(
      `${TRELLO_BASE}/cards/${cardId}/attachments${separator}${keyToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: prUrl, name: prTitle }),
      },
    );
  } catch (err) {
    console.error(
      `[PR Automation] Failed to attach PR to Trello card ${cardId}:`,
      err instanceof Error ? err.message : err,
    );
  }

  try {
    // Add a comment with the link
    await fetch(
      `${TRELLO_BASE}/cards/${cardId}/actions/comments${separator}${keyToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Pull request created: [${prTitle}](${prUrl})`,
        }),
      },
    );
  } catch (err) {
    console.error(
      `[PR Automation] Failed to comment on Trello card ${cardId}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

// ── Config Helpers ─────────────────────────────────────────────────────────

export function parsePrAutomationConfig(
  raw: string | null,
): PrAutomationConfig | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PrAutomationConfig;
  } catch {
    return null;
  }
}

/**
 * Count completed and total tasks from BoardData.
 */
export function countTasks(boardData: BoardData): {
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
export function extractIssueNumbers(boardData: BoardData): number[] {
  return boardData.cards
    .map((card) => {
      const num = Number(card.id);
      return Number.isFinite(num) && num > 0 ? num : null;
    })
    .filter((n): n is number => n !== null);
}
