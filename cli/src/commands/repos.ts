import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { isLoggedIn } from "../lib/config.js";

export const reposCommand = new Command("repos")
  .description("List your connected GitHub repositories")
  .action(async () => {
    if (!isLoggedIn()) {
      console.log(
        chalk.red("Not logged in. Run `taskpilot login` first."),
      );
      process.exit(1);
    }

    // Dynamic import to avoid loading api.ts at startup for all commands
    const { default: fetch } = await import("node-fetch" as string).catch(
      () => ({ default: globalThis.fetch }),
    );

    const { getServerUrl, getSessionCookie } = await import(
      "../lib/config.js"
    );
    const serverUrl = getServerUrl();
    const cookie = getSessionCookie();

    const spinner = ora("Fetching GitHub repos...").start();
    try {
      const res = await fetch(`${serverUrl}/api/github/repos`, {
        headers: {
          Cookie: cookie ?? "",
          Origin: serverUrl,
        },
        redirect: "manual",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        spinner.fail(body.error ?? `Error: ${res.status}`);
        process.exit(1);
      }

      const repos = (await res.json()) as Array<{
        full_name: string;
        description: string | null;
        private: boolean;
      }>;
      spinner.stop();

      if (repos.length === 0) {
        console.log(
          chalk.dim("No repositories found. Connect GitHub in settings first."),
        );
        return;
      }

      console.log(
        chalk.bold(`\n${repos.length} repositor${repos.length === 1 ? "y" : "ies"}:\n`),
      );

      for (const repo of repos) {
        const visibility = repo.private
          ? chalk.dim(" (private)")
          : "";
        console.log(
          `  ${chalk.cyan(repo.full_name)}${visibility}`,
        );
        if (repo.description) {
          console.log(
            `    ${chalk.dim(repo.description.slice(0, 80))}`,
          );
        }
      }
      console.log();
    } catch (err) {
      spinner.fail(
        err instanceof Error ? err.message : "Failed to fetch repos",
      );
      process.exit(1);
    }
  });
