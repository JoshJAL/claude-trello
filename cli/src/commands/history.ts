import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { isLoggedIn } from "../lib/config.js";
import {
  getSessions,
  getSessionDetail,
  getSessionEvents,
} from "../lib/api.js";
import type { AgentSessionSummary, SessionEvent } from "../lib/api.js";

function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return "<1s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatCost(cents: number): string {
  if (cents === 0) return "-";
  return `$${(cents / 100).toFixed(2)}`;
}

function statusColor(status: string): string {
  switch (status) {
    case "completed":
      return chalk.green(status);
    case "failed":
      return chalk.red(status);
    case "cancelled":
      return chalk.yellow(status);
    case "running":
      return chalk.blue(status);
    default:
      return status;
  }
}

function sourceIcon(source: string): string {
  switch (source) {
    case "github":
      return "GH";
    case "gitlab":
      return "GL";
    default:
      return "TR";
  }
}

function printSessionRow(s: AgentSessionSummary): void {
  const date = new Date(s.startedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  console.log(
    `  ${chalk.dim(s.id.slice(0, 8))}  ${chalk.dim(sourceIcon(s.source))}  ${s.sourceName.padEnd(24).slice(0, 24)}  ${statusColor(s.status).padEnd(20)}  ${`${s.tasksCompleted}/${s.tasksTotal}`.padEnd(6)}  ${formatCost(s.totalCostCents).padEnd(8)}  ${formatDuration(s.durationMs).padEnd(8)}  ${chalk.dim(date)}`,
  );
}

function getEventSummary(event: SessionEvent): string {
  const content = event.content;

  if (typeof content.content === "string" && content.content) {
    const text = content.content as string;
    return text.length > 120 ? text.slice(0, 120) + "..." : text;
  }

  if (event.type === "tool_use" && content.toolName) {
    return `${content.toolName as string}(...)`;
  }

  if (event.type === "tool_result" && content.toolName) {
    const result = typeof content.toolResult === "string"
      ? content.toolResult.slice(0, 80)
      : "";
    return `${content.toolName as string} -> ${result}`;
  }

  if (event.type === "task_completed") {
    return `Task completed`;
  }

  if (event.type === "error" && content.error) {
    return `Error: ${content.error as string}`;
  }

  if (event.type === "done") {
    return "Session finished";
  }

  return event.type;
}

function eventTypeColor(type: string): (s: string) => string {
  switch (type) {
    case "assistant":
      return chalk.white;
    case "tool_use":
      return chalk.blue;
    case "tool_result":
      return chalk.green;
    case "task_completed":
      return chalk.greenBright;
    case "error":
      return chalk.red;
    case "system":
      return chalk.dim;
    case "agent_started":
    case "agent_completed":
      return chalk.cyan;
    case "agent_failed":
      return chalk.red;
    default:
      return chalk.dim;
  }
}

export const historyCommand = new Command("history")
  .description("View past AI agent sessions")
  .argument("[sessionId]", "Session ID to view details")
  .option("--all", "List all sessions (default: last 10)")
  .option("--events", "Show full event log for a session")
  .option("--source <source>", "Filter by source: trello, github, gitlab")
  .option("--status <status>", "Filter by status: completed, failed, cancelled, running")
  .action(async (sessionId?: string, opts?: { all?: boolean; events?: boolean; source?: string; status?: string }) => {
    if (!isLoggedIn()) {
      console.log(chalk.red("\nNot logged in. Run `taskpilot login` first.\n"));
      process.exit(1);
    }

    // Detail view
    if (sessionId) {
      const spinner = ora("Loading session...").start();

      try {
        const { session } = await getSessionDetail(sessionId);
        spinner.stop();

        console.log(chalk.bold("\nSession Detail\n"));
        console.log(`  ID:        ${chalk.dim(session.id)}`);
        console.log(`  Source:    ${sourceIcon(session.source)} ${session.sourceName}`);
        console.log(`  Provider:  ${session.providerId}`);
        console.log(`  Mode:      ${session.mode}${session.mode === "parallel" && session.maxConcurrency ? ` (${session.maxConcurrency}x)` : ""}`);
        console.log(`  Status:    ${statusColor(session.status)}`);
        console.log(`  Tasks:     ${session.tasksCompleted}/${session.tasksTotal}`);
        console.log(`  Cost:      ${formatCost(session.totalCostCents)}`);
        console.log(`  Tokens:    ${session.inputTokens.toLocaleString()} in / ${session.outputTokens.toLocaleString()} out`);
        console.log(`  Duration:  ${formatDuration(session.durationMs)}`);
        console.log(`  Started:   ${new Date(session.startedAt).toLocaleString()}`);
        if (session.completedAt) {
          console.log(`  Completed: ${new Date(session.completedAt).toLocaleString()}`);
        }
        if (session.errorMessage) {
          console.log(`  Error:     ${chalk.red(session.errorMessage)}`);
        }
        if (session.initialMessage) {
          console.log(`  Message:   ${chalk.dim(session.initialMessage)}`);
        }

        // Show events if requested
        if (opts?.events) {
          console.log(chalk.bold("\n  Event Log\n"));

          let offset = 0;
          const limit = 100;
          let hasMore = true;

          while (hasMore) {
            const eventsData = await getSessionEvents(sessionId, limit, offset);

            for (const event of eventsData.events) {
              const time = new Date(event.timestamp).toLocaleTimeString();
              const colorFn = eventTypeColor(event.type);
              const agentTag = event.agentIndex !== null ? chalk.cyan(`[A${event.agentIndex}] `) : "";
              console.log(`  ${chalk.dim(time)} ${agentTag}${colorFn(getEventSummary(event))}`);
            }

            offset += limit;
            hasMore = offset < eventsData.total;
          }
        }

        console.log();
      } catch (err) {
        spinner.fail(err instanceof Error ? err.message : "Failed to load session");
        process.exit(1);
      }

      return;
    }

    // List view
    const spinner = ora("Loading sessions...").start();

    try {
      const limit = opts?.all ? 100 : 10;
      const data = await getSessions({
        limit,
        source: opts?.source,
        status: opts?.status,
        sort: "newest",
      });
      spinner.stop();

      if (data.sessions.length === 0) {
        console.log(chalk.dim("\nNo sessions found.\n"));
        return;
      }

      console.log(chalk.bold("\nSession History\n"));
      console.log(
        chalk.dim(
          `  ${"ID".padEnd(10)}${"Src".padEnd(4)}${"Board/Repo".padEnd(26)}${"Status".padEnd(14)}${"Tasks".padEnd(8)}${"Cost".padEnd(10)}${"Duration".padEnd(10)}Date`,
        ),
      );
      console.log(chalk.dim(`  ${"─".repeat(100)}`));

      for (const s of data.sessions) {
        printSessionRow(s);
      }

      if (data.total > data.sessions.length) {
        console.log(
          chalk.dim(`\n  Showing ${data.sessions.length} of ${data.total}. Use --all to see all.\n`),
        );
      } else {
        console.log();
      }
    } catch (err) {
      spinner.fail(err instanceof Error ? err.message : "Failed to load sessions");
      process.exit(1);
    }
  });
