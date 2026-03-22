import { resolve } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { Command } from "commander";
import { select, confirm, input } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import {
  getBoards,
  getBoardData,
  getCredentials,
  getGitHubRepos,
  getGitHubIssues,
  getGitLabProjects,
  getGitLabIssues,
} from "../lib/api.js";
import { isLoggedIn } from "../lib/config.js";
import { launchSession, runParallelSession } from "../lib/runner.js";
import { launchOpenAISession } from "../lib/providers/openai.js";
import { launchGroqSession } from "../lib/providers/groq.js";
import type { AgentMessage } from "../lib/providers/generic-agent.js";
import type { Query } from "../lib/runner.js";
import type {
  AiProviderId,
  BoardData,
  Credentials,
  TrelloCard,
  TrelloList,
  AgentStatus,
  ParallelEvent,
} from "../lib/types.js";

type SourceType = "trello" | "github" | "gitlab";

export const runCommand = new Command("run")
  .description("Select a task source and start an AI coding session")
  .option("-b, --board <id>", "Board/repo ID (skip interactive selection)")
  .option("-d, --dir <path>", "Working directory (default: current)")
  .option("-m, --message <text>", "Initial instructions for the AI")
  .option(
    "-s, --source <name>",
    "Task source: trello, github, gitlab (default: trello)",
  )
  .option(
    "-P, --provider <name>",
    "AI provider: claude, openai, groq (default: claude)",
  )
  .option("-p, --parallel", "Run one agent per card/issue in parallel")
  .option(
    "-c, --concurrency <n>",
    "Max concurrent agents in parallel mode (default: 3)",
    "3",
  )
  .option("--branch <name>", "Git branch to work on (local: checks out the branch; cloud: commits to it)")
  .option("--workspace <target>", "Cloud storage workspace (e.g. google:<folderId> or onedrive:<folderId>)")
  .option("--pr", "Create a PR/MR after session completes")
  .option("--no-pr", "Skip PR/MR creation even if automation is enabled")
  .action(
    async (opts: {
      board?: string;
      dir?: string;
      message?: string;
      source?: string;
      provider?: string;
      parallel?: boolean;
      concurrency?: string;
      branch?: string;
      workspace?: string;
      pr?: boolean;
    }) => {
      if (!isLoggedIn()) {
        console.log(
          chalk.red("Not logged in. Run `taskpilot login` first."),
        );
        process.exit(1);
      }

      const cwd = opts.dir ? resolve(opts.dir) : process.cwd();

      // Source validation
      const source = (opts.source ?? "trello") as SourceType;
      if (!["trello", "github", "gitlab"].includes(source)) {
        console.log(
          chalk.red(
            `Invalid source "${opts.source}". Use: trello, github, gitlab`,
          ),
        );
        process.exit(1);
      }

      // Provider selection
      const provider = (opts.provider ?? "claude") as AiProviderId;
      if (!["claude", "openai", "groq"].includes(provider)) {
        console.log(
          chalk.red(
            `Invalid provider "${opts.provider}". Use: claude, openai, groq`,
          ),
        );
        process.exit(1);
      }

      const providerLabel =
        provider === "claude"
          ? "Claude"
          : provider === "openai"
            ? "ChatGPT (OpenAI)"
            : "Groq";

      const isParallel = opts.parallel ?? false;
      const concurrency = Math.min(
        Math.max(1, parseInt(opts.concurrency ?? "3", 10)),
        5,
      );

      // Source-specific data holders
      let boardData: BoardData;
      let activeCardCount: number;
      let sourceExtra: {
        githubToken?: string;
        githubOwner?: string;
        githubRepo?: string;
        gitlabToken?: string;
        gitlabProjectId?: number;
      } = {};

      if (source === "github") {
        // ── GitHub flow ─────────────────────────────────────────────────
        const repoSpinner = ora("Fetching GitHub repos...").start();
        let repos;
        try {
          repos = await getGitHubRepos();
          repoSpinner.stop();
        } catch (err) {
          repoSpinner.fail(
            err instanceof Error ? err.message : "Failed to fetch repos",
          );
          process.exit(1);
        }

        if (repos.length === 0) {
          console.log(
            chalk.red("No repos found. Connect GitHub in settings first."),
          );
          process.exit(1);
        }

        const selectedRepo = opts.board
          ? repos.find((r) => r.full_name === opts.board) ?? { full_name: opts.board, name: opts.board, description: null, owner: { login: opts.board.split("/")[0] ?? "" } }
          : await select({
              message: "Select a repository:",
              choices: repos.map((r) => ({
                name: r.full_name,
                value: r,
                description: r.description?.slice(0, 60) || undefined,
              })),
            });

        const repoFullName = typeof selectedRepo === "string"
          ? selectedRepo
          : selectedRepo.full_name;
        const [ghOwner, ghRepo] = repoFullName.split("/");

        const issueSpinner = ora("Fetching issues...").start();
        let issues;
        try {
          issues = await getGitHubIssues(ghOwner, ghRepo);
          issueSpinner.stop();
        } catch (err) {
          issueSpinner.fail(
            err instanceof Error ? err.message : "Failed to fetch issues",
          );
          process.exit(1);
        }

        console.log(`\n${chalk.bold(repoFullName)}`);
        console.log(chalk.dim("\u2500".repeat(repoFullName.length)));

        if (issues.length === 0) {
          console.log(chalk.dim("\n  No open issues found."));
          return;
        }

        for (const issue of issues) {
          const taskTotal = issue.tasks.length;
          const taskDone = issue.tasks.filter((t) => t.checked).length;
          const progress = taskTotal > 0 ? ` [${taskDone}/${taskTotal}]` : "";
          console.log(
            `  ${chalk.white("\u2022")} #${issue.number} ${issue.title}${chalk.dim(progress)}`,
          );
        }

        activeCardCount = issues.length;

        // Convert issues to BoardData-compatible format
        boardData = {
          board: { id: repoFullName, name: repoFullName },
          cards: issues.map((issue) => ({
            id: String(issue.number),
            name: issue.title,
            desc: issue.body ?? "",
            checklists: [
              {
                id: `issue-${issue.number}`,
                name: "Tasks",
                checkItems: issue.tasks.map((t) => ({
                  id: `task-${t.index}`,
                  name: t.text,
                  state: t.checked ? "complete" : "incomplete",
                })),
              },
            ],
          })),
        };

        // Load credentials with source=github to get github token
        const credSpinner = ora("Loading credentials...").start();
        let credentials: Credentials;
        try {
          // Fetch credentials with source=github to get the GitHub token
          const { getServerUrl: getUrl, getSessionCookie: getCookie } = await import("../lib/config.js");
          const serverUrl = getUrl();
          const cookie = getCookie();
          const res = await fetch(`${serverUrl}/api/cli/credentials?source=github`, {
            headers: {
              "Content-Type": "application/json",
              Origin: serverUrl,
              Cookie: cookie ?? "",
            },
            redirect: "manual",
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({})) as { error?: string };
            throw new Error(body.error ?? `${res.status}`);
          }
          credentials = await res.json() as Credentials;
          credSpinner.succeed("Credentials loaded");
        } catch (err) {
          credSpinner.fail(
            err instanceof Error ? err.message : "Failed to load credentials",
          );
          process.exit(1);
        }

        sourceExtra = {
          githubToken: credentials.githubToken,
          githubOwner: ghOwner,
          githubRepo: ghRepo,
        };

        await runSourceSession({
          source,
          provider,
          providerLabel,
          isParallel,
          concurrency,
          cwd,
          boardData,
          credentials,
          activeCardCount,
          userMessage: opts.message,
          branch: opts.branch,
          sourceExtra,
        });
      } else if (source === "gitlab") {
        // ── GitLab flow ─────────────────────────────────────────────────
        const projSpinner = ora("Fetching GitLab projects...").start();
        let projects;
        try {
          projects = await getGitLabProjects();
          projSpinner.stop();
        } catch (err) {
          projSpinner.fail(
            err instanceof Error ? err.message : "Failed to fetch projects",
          );
          process.exit(1);
        }

        if (projects.length === 0) {
          console.log(
            chalk.red("No projects found. Connect GitLab in settings first."),
          );
          process.exit(1);
        }

        const selectedProject = opts.board
          ? projects.find((p) => String(p.id) === opts.board || p.path_with_namespace === opts.board) ?? projects[0]
          : await select({
              message: "Select a project:",
              choices: projects.map((p) => ({
                name: p.path_with_namespace,
                value: p,
                description: p.description?.slice(0, 60) || undefined,
              })),
            });

        const projectName = selectedProject.path_with_namespace;
        const projectId = selectedProject.id;

        const issueSpinner = ora("Fetching issues...").start();
        let issues;
        try {
          issues = await getGitLabIssues(projectId);
          issueSpinner.stop();
        } catch (err) {
          issueSpinner.fail(
            err instanceof Error ? err.message : "Failed to fetch issues",
          );
          process.exit(1);
        }

        console.log(`\n${chalk.bold(projectName)}`);
        console.log(chalk.dim("\u2500".repeat(projectName.length)));

        if (issues.length === 0) {
          console.log(chalk.dim("\n  No open issues found."));
          return;
        }

        for (const issue of issues) {
          const taskTotal = issue.tasks?.length ?? 0;
          const taskDone = issue.tasks?.filter((t) => t.checked).length ?? 0;
          const progress = taskTotal > 0 ? ` [${taskDone}/${taskTotal}]` : "";
          console.log(
            `  ${chalk.white("\u2022")} !${issue.iid} ${issue.title}${chalk.dim(progress)}`,
          );
        }

        activeCardCount = issues.length;

        // Convert issues to BoardData-compatible format
        boardData = {
          board: { id: String(projectId), name: projectName },
          cards: issues.map((issue) => ({
            id: String(issue.iid),
            name: issue.title,
            desc: issue.description ?? "",
            checklists: [
              {
                id: `issue-${issue.iid}`,
                name: "Tasks",
                checkItems: (issue.tasks ?? []).map((t) => ({
                  id: `task-${t.index}`,
                  name: t.text,
                  state: t.checked ? "complete" : "incomplete",
                })),
              },
            ],
          })),
        };

        // Load credentials with source=gitlab to get gitlab token
        const credSpinner = ora("Loading credentials...").start();
        let credentials: Credentials;
        try {
          const serverUrl = (await import("../lib/config.js")).getServerUrl();
          const cookie = (await import("../lib/config.js")).getSessionCookie();
          const res = await fetch(`${serverUrl}/api/cli/credentials?source=gitlab`, {
            headers: {
              "Content-Type": "application/json",
              Origin: serverUrl,
              Cookie: cookie ?? "",
            },
            redirect: "manual",
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({})) as { error?: string };
            throw new Error(body.error ?? `${res.status}`);
          }
          credentials = await res.json() as Credentials;
          credSpinner.succeed("Credentials loaded");
        } catch (err) {
          credSpinner.fail(
            err instanceof Error ? err.message : "Failed to load credentials",
          );
          process.exit(1);
        }

        sourceExtra = {
          gitlabToken: credentials.gitlabToken,
          gitlabProjectId: projectId,
        };

        await runSourceSession({
          source,
          provider,
          providerLabel,
          isParallel,
          concurrency,
          cwd,
          boardData,
          credentials,
          activeCardCount,
          userMessage: opts.message,
          branch: opts.branch,
          sourceExtra,
        });
      } else {
        // ── Trello flow (default) ───────────────────────────────────────
        let boardId = opts.board;
        let boardName = "";

        if (!boardId) {
          const spinner = ora("Fetching boards...").start();
          let boards;
          try {
            boards = await getBoards();
            spinner.stop();
          } catch (err) {
            spinner.fail(
              err instanceof Error ? err.message : "Failed to fetch boards",
            );
            process.exit(1);
          }

          if (boards.length === 0) {
            console.log(
              chalk.red("No boards found. Create a board on Trello first."),
            );
            process.exit(1);
          }

          boardId = await select({
            message: "Select a board:",
            choices: boards.map((b) => ({
              name: b.name,
              value: b.id,
              description: b.desc?.slice(0, 60) || undefined,
            })),
          });
          boardName = boards.find((b) => b.id === boardId)?.name ?? boardId;
        }

        // ── Fetch board data ──────────────────────────────────────────
        const dataSpinner = ora("Fetching cards and checklists...").start();
        let cardsResponse;
        try {
          cardsResponse = await getBoardData(boardId);
          dataSpinner.stop();
        } catch (err) {
          dataSpinner.fail(
            err instanceof Error ? err.message : "Failed to fetch board data",
          );
          process.exit(1);
        }

        const { cards, lists, doneListId } = cardsResponse;
        if (!boardName) boardName = boardId;

        // ── Display board overview ──────────────────────────────────────
        console.log(`\n${chalk.bold(boardName)}`);
        console.log(chalk.dim("\u2500".repeat(boardName.length)));

        const doneCards = doneListId
          ? cards.filter((c) => c.idList === doneListId)
          : [];
        const activeCards = doneListId
          ? cards.filter((c) => c.idList !== doneListId)
          : cards;

        const listMap = new Map<string, TrelloList>();
        for (const l of lists) listMap.set(l.id, l);

        const byList = new Map<string, TrelloCard[]>();
        for (const card of activeCards) {
          const existing = byList.get(card.idList ?? "") ?? [];
          existing.push(card);
          byList.set(card.idList ?? "", existing);
        }

        for (const [listId, listCards] of byList) {
          const listName = listMap.get(listId)?.name ?? "Unknown";
          console.log(
            `\n  ${chalk.cyan.bold(listName)} (${listCards.length} card${listCards.length === 1 ? "" : "s"}):`,
          );
          for (const card of listCards) {
            const total = card.checklists.reduce(
              (sum, cl) => sum + cl.checkItems.length,
              0,
            );
            const done = card.checklists.reduce(
              (sum, cl) =>
                sum +
                cl.checkItems.filter((i) => i.state === "complete").length,
              0,
            );
            const progress = total > 0 ? ` [${done}/${total}]` : "";
            console.log(
              `    ${chalk.white("\u2022")} ${card.name}${chalk.dim(progress)}`,
            );
          }
        }

        if (doneCards.length > 0) {
          console.log(
            `\n  ${chalk.dim(`Done (${doneCards.length} card${doneCards.length === 1 ? "" : "s"}) [skipped]`)}`,
          );
        }

        if (activeCards.length === 0) {
          console.log(chalk.dim("\n  No active cards to work on."));
          return;
        }

        activeCardCount = activeCards.length;

        boardData = {
          board: { id: boardId, name: boardName },
          cards,
          doneListId: doneListId ?? undefined,
        };

        // Load credentials
        const credSpinner = ora("Loading credentials...").start();
        let credentials: Credentials;
        try {
          credentials = await getCredentials();
          credSpinner.succeed("Credentials loaded");
        } catch (err) {
          credSpinner.fail(
            err instanceof Error ? err.message : "Failed to load credentials",
          );
          process.exit(1);
        }

        await runSourceSession({
          source,
          provider,
          providerLabel,
          isParallel,
          concurrency,
          cwd,
          boardData,
          credentials,
          activeCardCount,
          userMessage: opts.message,
          branch: opts.branch,
          sourceExtra: {},
        });
      }
    },
  );

// ── Unified session launcher ─────────────────────────────────────────────

interface SourceSessionOpts {
  source: SourceType;
  provider: AiProviderId;
  providerLabel: string;
  isParallel: boolean;
  concurrency: number;
  cwd: string;
  boardData: BoardData;
  credentials: Credentials;
  activeCardCount: number;
  userMessage?: string;
  branch?: string;
  sourceExtra: {
    githubToken?: string;
    githubOwner?: string;
    githubRepo?: string;
    gitlabToken?: string;
    gitlabProjectId?: number;
  };
}

async function runSourceSession(opts: SourceSessionOpts): Promise<void> {
  const {
    source,
    provider,
    providerLabel,
    isParallel,
    concurrency,
    cwd,
    boardData,
    credentials,
    activeCardCount,
    sourceExtra,
  } = opts;

  const itemLabel = source === "trello" ? "card" : "issue";

  console.log(`\n  ${chalk.dim(`Working directory: ${cwd}`)}`);
  console.log(`  ${chalk.dim(`Task source: ${source}`)}`);
  console.log(`  ${chalk.dim(`AI provider: ${providerLabel}`)}`);
  if (opts.branch) {
    console.log(`  ${chalk.dim(`Branch: ${opts.branch}`)}`);
  }

  if (isParallel) {
    console.log(
      chalk.yellow(
        `\n  Parallel mode: ${activeCardCount} ${itemLabel}s, up to ${concurrency} concurrent agents`,
      ),
    );
  }

  const proceed = await confirm({
    message: isParallel
      ? `Launch ${activeCardCount} parallel agents with ${providerLabel}? (concurrency: ${concurrency})`
      : `Start ${providerLabel} session? (${activeCardCount} active ${itemLabel}${activeCardCount === 1 ? "" : "s"})`,
    default: true,
  });

  if (!proceed) {
    console.log(chalk.dim("Cancelled."));
    return;
  }

  // ── Initial message ───────────────────────────────────────────────
  let userMessage = opts.userMessage;
  if (!userMessage) {
    userMessage = await input({
      message:
        "Instructions for the AI (optional — press Enter to skip):",
    });
  }

  const abortController = new AbortController();
  const sigintHandler = () => {
    console.log(chalk.dim("\n\nAborting session..."));
    abortController.abort();
  };
  process.on("SIGINT", sigintHandler);

  // ── Branch checkout (local mode) ──────────────────────────────────
  if (opts.branch) {
    const execAsync = promisify(execFile);
    try {
      await execAsync("git", ["checkout", opts.branch], { cwd });
      console.log(chalk.dim(`  Switched to branch '${opts.branch}'`));
    } catch (err) {
      console.error(
        chalk.red(
          `Failed to checkout branch '${opts.branch}': ${err instanceof Error ? err.message : "Unknown error"}`,
        ),
      );
      process.exit(1);
    }
  }

  try {
    const sessionOpts = {
      credentials,
      boardData,
      cwd,
      userMessage: userMessage || undefined,
      abortController,
      source,
      ...sourceExtra,
    };

    if (isParallel) {
      await runParallelMode({
        ...sessionOpts,
        maxConcurrency: concurrency,
        providerLabel,
      });
    } else if (provider === "openai") {
      await runGenericProviderMode(
        launchOpenAISession(sessionOpts),
        providerLabel,
      );
    } else if (provider === "groq") {
      await runGenericProviderMode(
        launchGroqSession(sessionOpts),
        providerLabel,
      );
    } else {
      await runSequentialMode({ ...sessionOpts, providerLabel });
    }
  } catch (err) {
    if (abortController.signal.aborted) {
      console.log(chalk.dim("\nSession aborted."));
    } else {
      console.error(
        chalk.red(
          `\nSession error: ${err instanceof Error ? err.message : "Unknown error"}`,
        ),
      );
      process.exit(1);
    }
  } finally {
    process.removeListener("SIGINT", sigintHandler);
  }
}

// ── Sequential mode ─────────────────────────────────────────────────────

interface SequentialModeOptions {
  credentials: import("../lib/types.js").Credentials;
  boardData: BoardData;
  cwd: string;
  userMessage?: string;
  abortController: AbortController;
  source?: SourceType;
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabToken?: string;
  gitlabProjectId?: number;
  providerLabel?: string;
}

async function runGenericProviderMode(
  session: AsyncGenerator<AgentMessage>,
  providerLabel: string,
): Promise<void> {
  console.log(
    `\n${chalk.bold.blue(`Starting ${providerLabel} session...`)}\n`,
  );

  for await (const msg of session) {
    switch (msg.type) {
      case "system":
        console.log(chalk.dim(`  ${msg.content}`));
        break;
      case "assistant":
        if (msg.content) console.log(msg.content);
        break;
      case "tool_use":
        if (msg.toolName === "check_trello_item") {
          console.log(chalk.green(`  \u2713 Checked item on Trello`));
        } else if (msg.toolName === "move_card_to_done") {
          console.log(chalk.green.bold(`  \u2713 Moved card to Done`));
        } else if (msg.toolName === "check_github_task") {
          console.log(chalk.green(`  \u2713 Checked task on GitHub`));
        } else if (msg.toolName === "close_github_issue") {
          console.log(chalk.green.bold(`  \u2713 Closed GitHub issue`));
        } else if (msg.toolName === "check_gitlab_task") {
          console.log(chalk.green(`  \u2713 Checked task on GitLab`));
        } else if (msg.toolName === "close_gitlab_issue") {
          console.log(chalk.green.bold(`  \u2713 Closed GitLab issue`));
        } else {
          console.log(chalk.dim(`  [${msg.toolName}]`));
        }
        break;
      case "tool_result":
        // Tool results are verbose — skip in normal output
        break;
      case "error":
        console.error(chalk.red(`  Error: ${msg.content}`));
        break;
      case "done":
        break;
    }
  }

  console.log(`\n${chalk.green.bold("Session complete.")}\n`);
}

async function runSequentialMode(opts: SequentialModeOptions): Promise<void> {
  const label = opts.providerLabel ?? "Claude";
  console.log(`\n${chalk.bold.blue(`Starting ${label} session...`)}\n`);

  const session = launchSession({
    credentials: opts.credentials,
    boardData: opts.boardData,
    cwd: opts.cwd,
    userMessage: opts.userMessage,
    abortController: opts.abortController,
    source: opts.source,
    githubToken: opts.githubToken,
    githubOwner: opts.githubOwner,
    githubRepo: opts.githubRepo,
    gitlabToken: opts.gitlabToken,
    gitlabProjectId: opts.gitlabProjectId,
  });

  for await (const message of session) {
    await handleMessage(message, session);
  }

  console.log(`\n${chalk.green.bold("Session complete.")}\n`);
}

// ── Parallel mode ───────────────────────────────────────────────────────

interface ParallelModeOptions {
  credentials: import("../lib/types.js").Credentials;
  boardData: BoardData;
  cwd: string;
  maxConcurrency: number;
  userMessage?: string;
  abortController: AbortController;
  source?: SourceType;
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabToken?: string;
  gitlabProjectId?: number;
  providerLabel?: string;
}

async function runParallelMode(opts: ParallelModeOptions): Promise<void> {
  const label = opts.providerLabel ?? "Claude";
  console.log(
    `\n${chalk.bold.blue(`Starting parallel ${label} session...`)}\n`,
  );

  const agentStatuses = new Map<string, AgentStatus>();

  for await (const event of runParallelSession({
    credentials: opts.credentials,
    boardData: opts.boardData,
    cwd: opts.cwd,
    maxConcurrency: opts.maxConcurrency,
    userMessage: opts.userMessage,
    abortController: opts.abortController,
    source: opts.source,
    githubToken: opts.githubToken,
    githubOwner: opts.githubOwner,
    githubRepo: opts.githubRepo,
    gitlabToken: opts.gitlabToken,
    gitlabProjectId: opts.gitlabProjectId,
  })) {
    renderParallelEvent(event, agentStatuses);
  }

  console.log(`\n${chalk.green.bold("Parallel session complete.")}\n`);
}

function renderParallelEvent(
  event: ParallelEvent,
  statuses: Map<string, AgentStatus>,
): void {
  switch (event.type) {
    case "agent_queued":
      statuses.set(event.cardId, {
        cardId: event.cardId,
        cardName: event.cardName,
        state: "queued",
        checklistTotal: 0,
        checklistDone: 0,
      });
      console.log(chalk.dim(`  [queued] ${event.cardName}`));
      break;

    case "agent_started": {
      const s = statuses.get(event.cardId);
      if (s) s.state = "running";
      console.log(
        chalk.blue(
          `  [started] ${s?.cardName ?? event.cardId} -> ${event.branch}`,
        ),
      );
      break;
    }

    case "agent_message": {
      // Show abbreviated agent output
      const msg = event.message as {
        type: string;
        message?: {
          content?: Array<{ type: string; text?: string; name?: string }>;
        };
      };
      if (msg.type === "assistant" && Array.isArray(msg.message?.content)) {
        for (const block of msg.message!.content) {
          if (block.type === "text" && block.text) {
            const shortId = event.cardId.slice(-4);
            const lines = block.text.split("\n");
            for (const line of lines) {
              if (line.trim()) {
                console.log(chalk.dim(`  [${shortId}] `) + line);
              }
            }
          } else if (block.type === "tool_use" && block.name) {
            const shortId = event.cardId.slice(-4);
            if (
              block.name === "mcp__trello-tools__check_trello_item"
            ) {
              console.log(
                chalk.dim(`  [${shortId}] `) +
                  chalk.green("\u2713 Checked item"),
              );
            } else if (
              block.name === "mcp__trello-tools__move_card_to_done"
            ) {
              console.log(
                chalk.dim(`  [${shortId}] `) +
                  chalk.green.bold("\u2713 Moved to Done"),
              );
            } else if (
              block.name === "mcp__github-tools__check_github_task"
            ) {
              console.log(
                chalk.dim(`  [${shortId}] `) +
                  chalk.green("\u2713 Checked task on GitHub"),
              );
            } else if (
              block.name === "mcp__github-tools__close_github_issue"
            ) {
              console.log(
                chalk.dim(`  [${shortId}] `) +
                  chalk.green.bold("\u2713 Closed GitHub issue"),
              );
            } else if (
              block.name === "mcp__gitlab-tools__check_gitlab_task"
            ) {
              console.log(
                chalk.dim(`  [${shortId}] `) +
                  chalk.green("\u2713 Checked task on GitLab"),
              );
            } else if (
              block.name === "mcp__gitlab-tools__close_gitlab_issue"
            ) {
              console.log(
                chalk.dim(`  [${shortId}] `) +
                  chalk.green.bold("\u2713 Closed GitLab issue"),
              );
            } else {
              console.log(
                chalk.dim(`  [${shortId}] [${block.name}]`),
              );
            }
          }
        }
      }
      break;
    }

    case "agent_completed":
      statuses.set(event.cardId, event.status);
      console.log(
        chalk.green(
          `  [completed] ${event.status.cardName} (${((event.status.durationMs ?? 0) / 1000).toFixed(1)}s)`,
        ),
      );
      break;

    case "agent_failed":
      console.log(
        chalk.red(
          `  [failed] ${statuses.get(event.cardId)?.cardName ?? event.cardId}: ${event.error}`,
        ),
      );
      break;

    case "merge_started":
      console.log(
        chalk.dim(
          `  [merging] ${statuses.get(event.cardId)?.cardName ?? event.cardId}`,
        ),
      );
      break;

    case "merge_completed":
      if (event.success) {
        console.log(
          chalk.green(
            `  [merged] ${statuses.get(event.cardId)?.cardName ?? event.cardId}`,
          ),
        );
      } else {
        console.log(
          chalk.red(
            `  [conflict] ${statuses.get(event.cardId)?.cardName ?? event.cardId}: ${event.conflicts?.join(", ")}`,
          ),
        );
      }
      break;

    case "summary": {
      const s = event.summary;
      console.log("\n" + chalk.bold("Session Summary"));
      console.log(chalk.dim("\u2500".repeat(40)));
      console.log(
        `  Integration branch: ${chalk.cyan(s.integrationBranch)}`,
      );
      console.log(
        `  Files changed: ${s.diffStats.filesChanged}  (+${s.diffStats.insertions} -${s.diffStats.deletions})`,
      );
      console.log(
        `  Duration: ${(s.totalDurationMs / 1000).toFixed(1)}s (wall clock)`,
      );
      console.log(
        `  Agents: ${s.agents.filter((a) => a.state === "completed").length} completed, ${s.agents.filter((a) => a.state === "failed").length} failed`,
      );
      if (s.mergeConflicts.length > 0) {
        console.log(
          chalk.red(`  Merge conflicts: ${s.mergeConflicts.length}`),
        );
        for (const c of s.mergeConflicts) {
          console.log(
            chalk.red(
              `    ${statuses.get(c.cardId)?.cardName ?? c.cardId}: ${c.files.join(", ")}`,
            ),
          );
        }
      }
      break;
    }
  }
}

// ── Message handling (sequential) ───────────────────────────────────────

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface MessagePayload {
  content?: ContentBlock[];
}

async function handleMessage(
  message: { type: string; [key: string]: unknown },
  session: Query,
): Promise<void> {
  switch (message.type) {
    case "system": {
      if (message.subtype === "init") {
        console.log(
          chalk.dim(
            `  Session initialized (model: ${message.model as string})\n`,
          ),
        );
      }
      break;
    }

    case "assistant": {
      const msg = message.message as MessagePayload | undefined;
      const content = msg?.content;
      if (!Array.isArray(content)) break;

      for (const block of content) {
        if (block.type === "text" && block.text) {
          console.log(block.text);
        } else if (block.type === "tool_use" && block.name) {
          const name = block.name;
          const toolInput = block.input ?? {};

          if (name === "mcp__trello-tools__check_trello_item") {
            console.log(chalk.green(`  \u2713 Checked item on Trello`));
          } else if (name === "mcp__trello-tools__move_card_to_done") {
            console.log(chalk.green.bold(`  \u2713 Moved card to Done`));
          } else if (name === "mcp__github-tools__check_github_task") {
            console.log(chalk.green(`  \u2713 Checked task on GitHub`));
          } else if (name === "mcp__github-tools__close_github_issue") {
            console.log(chalk.green.bold(`  \u2713 Closed GitHub issue`));
          } else if (name === "mcp__github-tools__comment_on_issue") {
            console.log(chalk.green(`  \u2713 Commented on GitHub issue`));
          } else if (name === "mcp__gitlab-tools__check_gitlab_task") {
            console.log(chalk.green(`  \u2713 Checked task on GitLab`));
          } else if (name === "mcp__gitlab-tools__close_gitlab_issue") {
            console.log(chalk.green.bold(`  \u2713 Closed GitLab issue`));
          } else if (name === "mcp__gitlab-tools__comment_on_issue") {
            console.log(chalk.green(`  \u2713 Commented on GitLab issue`));
          } else if (name === "AskUserQuestion") {
            const questions = toolInput.questions as
              | Array<{ question: string }>
              | undefined;
            if (questions && questions.length > 0) {
              const questionText = questions
                .map((q) => q.question)
                .join("\n");
              console.log(chalk.yellow(`\n  ? ${questionText}\n`));

              const answer = await input({ message: ">" });

              async function* userInput() {
                yield {
                  type: "user" as const,
                  message: {
                    role: "user" as const,
                    content: answer,
                  },
                  parent_tool_use_id: null,
                  session_id: "",
                };
              }
              await session.streamInput(userInput());
            }
          } else {
            console.log(formatToolUse(name, toolInput));
          }
        }
      }
      break;
    }

    case "result": {
      const result = (message.result ?? message.subtype) as string;
      console.log(chalk.dim(`\n  Result: ${result}`));
      break;
    }
  }
}

function formatToolUse(
  name: string,
  toolInput: Record<string, unknown>,
): string {
  const path = (toolInput.file_path ??
    toolInput.path ??
    toolInput.pattern ??
    "") as string;
  const shortPath = path ? ` ${chalk.cyan(path)}` : "";

  switch (name) {
    case "Read":
      return chalk.dim(`  Reading${shortPath}`);
    case "Edit":
      return chalk.dim(`  Editing${shortPath}`);
    case "Write":
      return chalk.dim(`  Writing${shortPath}`);
    case "Glob":
      return chalk.dim(`  Searching files${shortPath}`);
    case "Grep":
      return chalk.dim(
        `  Searching for ${chalk.cyan((toolInput.pattern as string) || "...")}${toolInput.path ? ` in ${chalk.cyan(toolInput.path as string)}` : ""}`,
      );
    case "Bash": {
      const cmd = (toolInput.command as string) || "";
      const preview = cmd.length > 80 ? cmd.slice(0, 77) + "..." : cmd;
      return chalk.dim(`  Running ${chalk.cyan(preview)}`);
    }
    case "TodoWrite":
      return chalk.dim("  Updating task list");
    case "Agent":
      return chalk.dim(
        `  Spawning agent${toolInput.description ? `: ${toolInput.description as string}` : ""}`,
      );
    default:
      return chalk.dim(`  [${name}]${shortPath}`);
  }
}
