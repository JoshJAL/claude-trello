import {
  query,
  tool,
  createSdkMcpServer,
} from "@anthropic-ai/claude-agent-sdk";
import type { Query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { randomBytes } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { createTrelloClient } from "./trello.js";
import * as github from "./github.js";
import * as gitlab from "./gitlab.js";
import type {
  BoardData,
  Credentials,
  TrelloCard,
  AgentStatus,
  ParallelEvent,
  ParallelSessionSummary,
} from "./types.js";

const execAsync = promisify(execFile);

// ── Trello Prompts ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are operating on a codebase. You have been given a Trello board containing tasks.
Work through each card and checklist item in order.
For each checklist item you complete, call the check_trello_item tool with the checkItemId and cardId.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL checklist items on a card, call move_card_to_done with the cardId to move it to the Done list.
Once a card is in Done, do not interact with it again — move on to the next card.
Focus on one card at a time. Complete all its items, move it to Done, then proceed to the next.`;

const PARALLEL_AGENT_SYSTEM_PROMPT = `You are assigned ONE card from a Trello board. Focus exclusively on it.
Work through each checklist item in order. For each item you complete, call check_trello_item with the checkItemId and cardId.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL checklist items, call move_card_to_done with the cardId.
You are working in an isolated git worktree. Commit your changes when done.
Do NOT modify files outside the scope of your assigned card.`;

// ── GitHub Prompts ──────────────────────────────────────────────────────────

const GITHUB_SYSTEM_PROMPT = `You are operating on a codebase. You have been given GitHub issues containing tasks.
Work through each issue and its task list items in order.
For each task item you complete, call the check_github_task tool with the issueNumber and taskIndex.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL task items on an issue, call close_github_issue with the issueNumber.
When you have finished all issues, call create_pull_request to submit your changes.
Focus on one issue at a time. Complete all its tasks, close it, then proceed to the next.`;

const GITHUB_PARALLEL_SYSTEM_PROMPT = `You are assigned ONE GitHub issue. Focus exclusively on it.
Work through each task list item in order. For each item you complete, call check_github_task with the issueNumber and taskIndex.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL task items, call close_github_issue with the issueNumber.
You are working in an isolated git worktree. Commit your changes when done.
Do NOT modify files outside the scope of your assigned issue.`;

// ── GitLab Prompts ──────────────────────────────────────────────────────────

const GITLAB_SYSTEM_PROMPT = `You are operating on a codebase. You have been given GitLab issues containing tasks.
Work through each issue and its task list items in order.
For each task item you complete, call the check_gitlab_task tool with the issueIid and taskIndex.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL task items on an issue, call close_gitlab_issue with the issueIid.
When you have finished all issues, call create_merge_request to submit your changes.
Focus on one issue at a time. Complete all its tasks, close it, then proceed to the next.`;

const GITLAB_PARALLEL_SYSTEM_PROMPT = `You are assigned ONE GitLab issue. Focus exclusively on it.
Work through each task list item in order. For each item you complete, call check_gitlab_task with the issueIid and taskIndex.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL task items, call close_gitlab_issue with the issueIid.
You are working in an isolated git worktree. Commit your changes when done.
Do NOT modify files outside the scope of your assigned issue.`;

function buildUserPrompt(
  boardData: BoardData,
  userMessage?: string,
): string {
  let prompt = `Here is the Trello board with tasks to complete:\n\n${JSON.stringify(boardData, null, 2)}`;
  if (userMessage?.trim()) {
    prompt += `\n\nAdditional instructions from the user:\n${userMessage.trim()}`;
  }
  return prompt;
}

function buildParallelCardPrompt(
  card: TrelloCard,
  boardName: string,
  userMessage?: string,
): string {
  const cardData = {
    board: { name: boardName },
    card: {
      id: card.id,
      name: card.name,
      desc: card.desc,
      checklists: card.checklists,
    },
  };

  let prompt = `Here is your assigned card:\n\n${JSON.stringify(cardData, null, 2)}`;
  if (userMessage?.trim()) {
    prompt += `\n\nAdditional instructions from the user:\n${userMessage.trim()}`;
  }
  return prompt;
}

// ── GitHub/GitLab MCP server builders ───────────────────────────────────────

type SdkMcpServer = ReturnType<typeof createSdkMcpServer>;

function buildGitHubMcpServer(
  token: string,
  owner: string,
  repo: string,
): { server: SdkMcpServer; toolNames: string[] } {
  const checkGithubTask = tool(
    "check_github_task",
    "Mark a GitHub issue task list item as complete once the corresponding code task is done.",
    {
      issueNumber: z.number().describe("The GitHub issue number"),
      taskIndex: z.number().describe("Zero-based index of the task item in the issue body"),
    },
    async ({ issueNumber, taskIndex }) => {
      const issues = await github.getIssues(token, owner, repo);
      const issue = issues.find((i) => i.number === issueNumber);
      if (!issue?.body) {
        return {
          content: [{ type: "text" as const, text: `Issue #${issueNumber} not found or has no body` }],
        };
      }
      // getIssues returns the raw body on the issue object, but we typed it with tasks.
      // We need to fetch the raw body. The getIssues function returns the issue with body.
      const updatedBody = github.toggleTaskItem(issue.body, taskIndex, true);
      await github.updateIssueBody(token, owner, repo, issueNumber, updatedBody);
      return {
        content: [{ type: "text" as const, text: `Checked task ${taskIndex} on issue #${issueNumber}` }],
      };
    },
  );

  const closeGithubIssue = tool(
    "close_github_issue",
    "Close a GitHub issue after all its task items are completed.",
    {
      issueNumber: z.number().describe("The GitHub issue number to close"),
    },
    async ({ issueNumber }) => {
      await github.closeIssue(token, owner, repo, issueNumber);
      return {
        content: [{ type: "text" as const, text: `Closed issue #${issueNumber}` }],
      };
    },
  );

  const commentOnIssue = tool(
    "comment_on_issue",
    "Add a comment to a GitHub issue.",
    {
      issueNumber: z.number().describe("The GitHub issue number"),
      body: z.string().describe("The comment body text"),
    },
    async ({ issueNumber, body }) => {
      // Add comment by calling the GitHub API
      const res = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body }),
        },
      );
      if (!res.ok) {
        return {
          content: [{ type: "text" as const, text: `Failed to add comment: ${res.status}` }],
        };
      }
      return {
        content: [{ type: "text" as const, text: `Added comment on issue #${issueNumber}` }],
      };
    },
  );

  const server = createSdkMcpServer({
    name: "github-tools",
    tools: [checkGithubTask, closeGithubIssue, commentOnIssue],
  });

  return {
    server,
    toolNames: [
      "mcp__github-tools__check_github_task",
      "mcp__github-tools__close_github_issue",
      "mcp__github-tools__comment_on_issue",
    ],
  };
}

function buildGitLabMcpServer(
  token: string,
  projectId: number,
): { server: SdkMcpServer; toolNames: string[] } {
  const checkGitlabTask = tool(
    "check_gitlab_task",
    "Mark a GitLab issue task list item as complete once the corresponding code task is done.",
    {
      issueIid: z.number().describe("The GitLab issue IID (project-scoped number)"),
      taskIndex: z.number().describe("Zero-based index of the task item in the issue description"),
    },
    async ({ issueIid, taskIndex }) => {
      const issue = await gitlab.getIssue(token, projectId, issueIid);
      if (!issue?.description) {
        return {
          content: [{ type: "text" as const, text: `Issue !${issueIid} not found or has no description` }],
        };
      }
      const updatedDescription = gitlab.toggleTaskItem(issue.description, taskIndex, true);
      await gitlab.updateIssueDescription(token, projectId, issueIid, updatedDescription);
      return {
        content: [{ type: "text" as const, text: `Checked task ${taskIndex} on issue !${issueIid}` }],
      };
    },
  );

  const closeGitlabIssue = tool(
    "close_gitlab_issue",
    "Close a GitLab issue after all its task items are completed.",
    {
      issueIid: z.number().describe("The GitLab issue IID to close"),
    },
    async ({ issueIid }) => {
      await gitlab.closeIssue(token, projectId, issueIid);
      return {
        content: [{ type: "text" as const, text: `Closed issue !${issueIid}` }],
      };
    },
  );

  const commentOnGitlabIssue = tool(
    "comment_on_issue",
    "Add a note/comment to a GitLab issue.",
    {
      issueIid: z.number().describe("The GitLab issue IID"),
      body: z.string().describe("The note body text"),
    },
    async ({ issueIid, body }) => {
      await gitlab.addNote(token, projectId, issueIid, body);
      return {
        content: [{ type: "text" as const, text: `Added note on issue !${issueIid}` }],
      };
    },
  );

  const server = createSdkMcpServer({
    name: "gitlab-tools",
    tools: [checkGitlabTask, closeGitlabIssue, commentOnGitlabIssue],
  });

  return {
    server,
    toolNames: [
      "mcp__gitlab-tools__check_gitlab_task",
      "mcp__gitlab-tools__close_gitlab_issue",
      "mcp__gitlab-tools__comment_on_issue",
    ],
  };
}

export interface RunnerOptions {
  credentials: Credentials;
  boardData: BoardData;
  cwd: string;
  userMessage?: string;
  abortController?: AbortController;
  source?: "trello" | "github" | "gitlab";
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabToken?: string;
  gitlabProjectId?: number;
}

export type { Query };

export function launchSession(options: RunnerOptions): Query {
  const { credentials, boardData, cwd, userMessage, abortController, source = "trello" } = options;

  // ── GitHub source ─────────────────────────────────────────────────────
  if (source === "github") {
    const ghToken = options.githubToken ?? credentials.githubToken ?? "";
    const ghOwner = options.githubOwner ?? "";
    const ghRepo = options.githubRepo ?? "";
    const { server, toolNames } = buildGitHubMcpServer(ghToken, ghOwner, ghRepo);

    return query({
      prompt: buildUserPrompt(boardData, userMessage),
      options: {
        abortController,
        cwd,
        env: {
          ANTHROPIC_API_KEY: credentials.anthropicApiKey,
          CLAUDE_AGENT_SDK_CLIENT_APP: "taskpilot-cli/0.1.0",
        },
        systemPrompt: GITHUB_SYSTEM_PROMPT,
        permissionMode: "acceptEdits",
        allowedTools: toolNames,
        maxTurns: 50,
        mcpServers: { "github-tools": server },
        persistSession: false,
      },
    });
  }

  // ── GitLab source ─────────────────────────────────────────────────────
  if (source === "gitlab") {
    const glToken = options.gitlabToken ?? credentials.gitlabToken ?? "";
    const glProjectId = options.gitlabProjectId ?? 0;
    const { server, toolNames } = buildGitLabMcpServer(glToken, glProjectId);

    return query({
      prompt: buildUserPrompt(boardData, userMessage),
      options: {
        abortController,
        cwd,
        env: {
          ANTHROPIC_API_KEY: credentials.anthropicApiKey,
          CLAUDE_AGENT_SDK_CLIENT_APP: "taskpilot-cli/0.1.0",
        },
        systemPrompt: GITLAB_SYSTEM_PROMPT,
        permissionMode: "acceptEdits",
        allowedTools: toolNames,
        maxTurns: 50,
        mcpServers: { "gitlab-tools": server },
        persistSession: false,
      },
    });
  }

  // ── Trello source (default) ───────────────────────────────────────────
  const trello = createTrelloClient(
    credentials.trelloApiKey,
    credentials.trelloToken,
  );

  const activeBoardData: BoardData = {
    ...boardData,
    cards: boardData.doneListId
      ? boardData.cards.filter((c) => c.idList !== boardData.doneListId)
      : boardData.cards,
  };

  const checkTrelloItem = tool(
    "check_trello_item",
    "Mark a Trello checklist item as complete once the corresponding code task is done.",
    {
      checkItemId: z.string().describe("The Trello checklist item ID"),
      cardId: z.string().describe("The Trello card ID"),
    },
    async ({ checkItemId, cardId }) => {
      await trello.updateCheckItem(cardId, checkItemId, "complete");
      return {
        content: [
          {
            type: "text" as const,
            text: `Marked checklist item ${checkItemId} as complete on card ${cardId}`,
          },
        ],
      };
    },
  );

  const moveCardToDone = tool(
    "move_card_to_done",
    "Move a Trello card to the Done list after all its checklist items are completed.",
    {
      cardId: z.string().describe("The Trello card ID to move to Done"),
    },
    async ({ cardId }) => {
      const doneListId = await trello.findOrCreateDoneList(boardData.board.id);
      await trello.moveCard(cardId, doneListId);
      return {
        content: [
          {
            type: "text" as const,
            text: `Moved card ${cardId} to Done list`,
          },
        ],
      };
    },
  );

  const trelloServer = createSdkMcpServer({
    name: "trello-tools",
    tools: [checkTrelloItem, moveCardToDone],
  });

  return query({
    prompt: buildUserPrompt(activeBoardData, userMessage),
    options: {
      abortController,
      cwd,
      env: {
        ANTHROPIC_API_KEY: credentials.anthropicApiKey,
        CLAUDE_AGENT_SDK_CLIENT_APP: "taskpilot-cli/0.1.0",
      },
      systemPrompt: SYSTEM_PROMPT,
      permissionMode: "acceptEdits",
      allowedTools: [
        "mcp__trello-tools__check_trello_item",
        "mcp__trello-tools__move_card_to_done",
      ],
      maxTurns: 50,
      mcpServers: {
        "trello-tools": trelloServer,
      },
      persistSession: false,
    },
  });
}

// ── Parallel Session ──────────────────────────────────────────────────────

export interface ParallelRunnerOptions {
  credentials: Credentials;
  boardData: BoardData;
  cwd: string;
  maxConcurrency: number;
  userMessage?: string;
  abortController?: AbortController;
  source?: "trello" | "github" | "gitlab";
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabToken?: string;
  gitlabProjectId?: number;
}

async function git(
  cwd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return execAsync("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
}

async function createWorktree(cwd: string, branchName: string): Promise<string> {
  const worktreePath = join(cwd, ".taskpilot-worktrees", branchName);
  await git(cwd, ["worktree", "add", "-b", branchName, worktreePath, "HEAD"]);

  try {
    const { stdout } = await execAsync("ls", ["-d", join(cwd, "node_modules")]);
    if (stdout.trim()) {
      await execAsync("ln", [
        "-sf",
        join(cwd, "node_modules"),
        join(worktreePath, "node_modules"),
      ]);
    }
  } catch {
    // node_modules doesn't exist, skip
  }

  return worktreePath;
}

async function removeWorktree(cwd: string, worktreePath: string): Promise<void> {
  await git(cwd, ["worktree", "remove", "--force", worktreePath]);
}

export async function* runParallelSession(
  options: ParallelRunnerOptions,
): AsyncGenerator<ParallelEvent> {
  const {
    credentials,
    boardData,
    cwd,
    maxConcurrency,
    userMessage,
    abortController,
    source = "trello",
  } = options;

  const sessionId = randomBytes(4).toString("hex");
  const effectiveConcurrency = Math.min(maxConcurrency, 5);

  const trello = source === "trello"
    ? createTrelloClient(credentials.trelloApiKey, credentials.trelloToken)
    : null;

  const activeCards = boardData.doneListId
    ? boardData.cards.filter((c) => c.idList !== boardData.doneListId)
    : boardData.cards;

  if (activeCards.length === 0) return;

  const baseBranch = (await git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"])).stdout.trim();
  const baseSha = (await git(cwd, ["rev-parse", "HEAD"])).stdout.trim();

  const agentStatuses = new Map<string, AgentStatus>();
  const worktrees = new Map<string, string>();
  const branches = new Map<string, string>();

  // Queue all cards
  for (const card of activeCards) {
    agentStatuses.set(card.id, {
      cardId: card.id,
      cardName: card.name,
      state: "queued",
      checklistTotal: card.checklists.reduce(
        (sum, cl) => sum + cl.checkItems.length,
        0,
      ),
      checklistDone: card.checklists.reduce(
        (sum, cl) =>
          sum + cl.checkItems.filter((i) => i.state === "complete").length,
        0,
      ),
    });
    yield { type: "agent_queued", cardId: card.id, cardName: card.name };
  }

  const queue = [...activeCards];

  async function runAgent(card: TrelloCard): Promise<ParallelEvent[]> {
    const events: ParallelEvent[] = [];
    const branchName = `parallel/${sessionId}/${card.id.slice(-6)}`;
    branches.set(card.id, branchName);
    const startTime = Date.now();

    try {
      const worktreePath = await createWorktree(cwd, branchName);
      worktrees.set(card.id, worktreePath);

      const status = agentStatuses.get(card.id)!;
      status.state = "running";
      status.branch = branchName;
      status.worktreePath = worktreePath;

      events.push({
        type: "agent_started",
        cardId: card.id,
        branch: branchName,
        worktreePath,
      });

      // Build tools scoped to this card, based on source
      let mcpServerName: string;
      let mcpServer: SdkMcpServer;
      let allowedTools: string[];
      let systemPrompt: string;

      if (source === "github") {
        const ghToken = options.githubToken ?? credentials.githubToken ?? "";
        const ghOwner = options.githubOwner ?? "";
        const ghRepo = options.githubRepo ?? "";
        const gh = buildGitHubMcpServer(ghToken, ghOwner, ghRepo);
        mcpServerName = "github-tools";
        mcpServer = gh.server;
        allowedTools = gh.toolNames;
        systemPrompt = GITHUB_PARALLEL_SYSTEM_PROMPT;
      } else if (source === "gitlab") {
        const glToken = options.gitlabToken ?? credentials.gitlabToken ?? "";
        const glProjectId = options.gitlabProjectId ?? 0;
        const gl = buildGitLabMcpServer(glToken, glProjectId);
        mcpServerName = "gitlab-tools";
        mcpServer = gl.server;
        allowedTools = gl.toolNames;
        systemPrompt = GITLAB_PARALLEL_SYSTEM_PROMPT;
      } else {
        const checkTrelloItem = tool(
          "check_trello_item",
          "Mark a Trello checklist item as complete.",
          {
            checkItemId: z.string().describe("The Trello checklist item ID"),
            cardId: z.string().describe("The Trello card ID"),
          },
          async ({ checkItemId, cardId }) => {
            await trello!.updateCheckItem(cardId, checkItemId, "complete");
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Marked checklist item ${checkItemId} as complete on card ${cardId}`,
                },
              ],
            };
          },
        );

        const moveCardToDone = tool(
          "move_card_to_done",
          "Move a Trello card to the Done list after all checklist items are completed.",
          {
            cardId: z.string().describe("The Trello card ID to move to Done"),
          },
          async ({ cardId }) => {
            const doneListId = await trello!.findOrCreateDoneList(boardData.board.id);
            await trello!.moveCard(cardId, doneListId);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Moved card ${cardId} to Done list`,
                },
              ],
            };
          },
        );

        mcpServerName = "trello-tools";
        mcpServer = createSdkMcpServer({
          name: "trello-tools",
          tools: [checkTrelloItem, moveCardToDone],
        });
        allowedTools = [
          "mcp__trello-tools__check_trello_item",
          "mcp__trello-tools__move_card_to_done",
        ];
        systemPrompt = PARALLEL_AGENT_SYSTEM_PROMPT;
      }

      const agentQuery = query({
        prompt: buildParallelCardPrompt(card, boardData.board.name, userMessage),
        options: {
          abortController,
          cwd: worktreePath,
          env: {
            ANTHROPIC_API_KEY: credentials.anthropicApiKey,
            CLAUDE_AGENT_SDK_CLIENT_APP: "taskpilot-cli/0.1.0",
          },
          systemPrompt,
          permissionMode: "acceptEdits",
          allowedTools,
          maxTurns: 30,
          mcpServers: { [mcpServerName]: mcpServer },
          persistSession: false,
        },
      });

      for await (const message of agentQuery) {
        events.push({ type: "agent_message", cardId: card.id, message });
      }

      status.state = "completed";
      status.durationMs = Date.now() - startTime;
      events.push({ type: "agent_completed", cardId: card.id, status: { ...status } });
    } catch (err) {
      const status = agentStatuses.get(card.id)!;
      status.state = "failed";
      status.error = err instanceof Error ? err.message : "Unknown error";
      status.durationMs = Date.now() - startTime;
      events.push({ type: "agent_failed", cardId: card.id, error: status.error });
    }

    return events;
  }

  // Run agents with concurrency control
  const results: ParallelEvent[][] = [];
  let queueIndex = 0;

  async function worker(): Promise<void> {
    while (queueIndex < queue.length) {
      if (abortController?.signal.aborted) return;
      const card = queue[queueIndex++];
      if (!card) return;
      const events = await runAgent(card);
      results.push(events);
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(effectiveConcurrency, queue.length); i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  for (const eventBatch of results) {
    for (const event of eventBatch) {
      yield event;
    }
  }

  // ── Merge phase ─────────────────────────────────────────────────────────
  const integrationBranch = `parallel/integration/${sessionId}`;
  await git(cwd, ["checkout", "-b", integrationBranch]);

  const mergeConflicts: Array<{ cardId: string; files: string[] }> = [];

  for (const card of activeCards) {
    const branch = branches.get(card.id);
    const worktreePath = worktrees.get(card.id);
    const status = agentStatuses.get(card.id)!;

    if (!branch || status.state === "failed") continue;

    yield { type: "merge_started", cardId: card.id };
    status.state = "merging";

    try {
      await git(cwd, [
        "merge",
        "--no-ff",
        "-m",
        `Merge parallel agent: ${branch}`,
        branch,
      ]);
      yield { type: "merge_completed", cardId: card.id, success: true };
    } catch {
      const { stdout } = await git(cwd, [
        "diff",
        "--name-only",
        "--diff-filter=U",
      ]);
      const conflicts = stdout
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      if (conflicts.length > 0) {
        await git(cwd, ["merge", "--abort"]);
        status.state = "conflict";
        mergeConflicts.push({ cardId: card.id, files: conflicts });
        yield {
          type: "merge_completed",
          cardId: card.id,
          success: false,
          conflicts,
        };
      }
    }

    // Cleanup
    if (worktreePath) {
      try {
        await removeWorktree(cwd, worktreePath);
      } catch {
        // Best effort
      }
    }
    try {
      await git(cwd, ["branch", "-D", branch]);
    } catch {
      // Best effort
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  let diffStats = { filesChanged: 0, insertions: 0, deletions: 0 };
  try {
    const { stdout } = await git(cwd, [
      "diff",
      "--numstat",
      `${baseSha}...HEAD`,
    ]);
    for (const line of stdout.trim().split("\n")) {
      const match = line.match(/^(\d+)\t(\d+)\t/);
      if (match) {
        diffStats.filesChanged++;
        diffStats.insertions += parseInt(match[1], 10);
        diffStats.deletions += parseInt(match[2], 10);
      }
    }
  } catch {
    // Stats unavailable
  }

  const summary: ParallelSessionSummary = {
    agents: Array.from(agentStatuses.values()),
    totalCostUsd: Array.from(agentStatuses.values()).reduce(
      (sum, a) => sum + (a.costUsd ?? 0),
      0,
    ),
    totalDurationMs: Array.from(agentStatuses.values()).reduce(
      (max, a) => Math.max(max, a.durationMs ?? 0),
      0,
    ),
    integrationBranch,
    mergeConflicts,
    diffStats,
  };

  yield { type: "summary", summary };

  // Return to original branch
  try {
    await git(cwd, ["checkout", baseBranch]);
  } catch {
    // Best effort
  }
}
