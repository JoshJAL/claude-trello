import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { isLoggedIn } from "../lib/config.js";
import { getServerUrl, getSessionCookie } from "../lib/config.js";

interface SummaryResponse {
  totalCostCents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  sessionCount: number;
  tasksCompleted: number;
  avgCostCentsPerSession: number;
  monthlyBudgetCents: number | null;
  budgetAlertThreshold: number;
  monthLabel: string;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

async function fetchSummary(): Promise<SummaryResponse> {
  const serverUrl = getServerUrl();
  const cookie = getSessionCookie();
  if (!cookie) throw new Error("Not logged in");

  const res = await fetch(`${serverUrl}/api/analytics/summary`, {
    headers: {
      "Content-Type": "application/json",
      Origin: serverUrl,
      Cookie: cookie,
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.json() as Promise<SummaryResponse>;
}

export const usageCommand = new Command("usage")
  .description("Show current month spending and usage summary")
  .action(async () => {
    if (!isLoggedIn()) {
      console.log(chalk.red("\nNot logged in. Run `taskpilot login` first.\n"));
      process.exit(1);
    }

    const spinner = ora("Loading usage data...").start();

    try {
      const data = await fetchSummary();
      spinner.stop();

      console.log(chalk.bold(`\nUsage — ${data.monthLabel}\n`));
      console.log(`  Total Spend:  ${chalk.green(formatCents(data.totalCostCents))}`);
      console.log(`  Sessions:     ${data.sessionCount}`);
      console.log(`  Tasks Done:   ${data.tasksCompleted}`);
      console.log(`  Avg / Session: ${formatCents(data.avgCostCentsPerSession)}`);
      console.log(`  Tokens:       ${formatTokens(data.totalInputTokens)} in / ${formatTokens(data.totalOutputTokens)} out`);

      if (data.monthlyBudgetCents !== null) {
        const pct = Math.min(100, (data.totalCostCents / data.monthlyBudgetCents) * 100);
        const budgetStr = `${formatCents(data.totalCostCents)} / ${formatCents(data.monthlyBudgetCents)} (${pct.toFixed(0)}%)`;
        const color = pct >= 100 ? chalk.red : pct >= data.budgetAlertThreshold ? chalk.yellow : chalk.green;
        console.log(`  Budget:       ${color(budgetStr)}`);
      }

      console.log();
    } catch (err) {
      spinner.fail(err instanceof Error ? err.message : "Failed to load usage data");
      process.exit(1);
    }
  });
