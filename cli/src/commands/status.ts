import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { getIntegrationStatus } from "../lib/api.js";
import { getConfig, isLoggedIn, getServerUrl } from "../lib/config.js";

export const statusCommand = new Command("status")
  .description("Check connection and integration status")
  .action(async () => {
    const config = getConfig();

    console.log(chalk.bold("\nClaude Trello Bridge — Status\n"));
    console.log(`  Server:  ${chalk.dim(getServerUrl())}`);

    if (!isLoggedIn()) {
      console.log(`  Auth:    ${chalk.red("Not logged in")}`);
      console.log(chalk.dim("\n  Run `claude-trello login` to sign in.\n"));
      return;
    }

    console.log(
      `  Auth:    ${chalk.green("Signed in")} as ${config.userName ?? config.userEmail ?? "unknown"}`,
    );

    const spinner = ora("Checking integrations...").start();

    try {
      const status = await getIntegrationStatus();
      spinner.stop();

      console.log(
        `  Trello:  ${status.trelloLinked ? chalk.green("Connected") : chalk.red("Not connected")}`,
      );
      console.log(
        `  API Key: ${status.hasApiKey ? chalk.green("Configured") : chalk.red("Not set")}`,
      );

      if (!status.trelloLinked || !status.hasApiKey) {
        console.log(
          chalk.dim(
            "\n  Complete setup at your web dashboard to use the CLI.\n",
          ),
        );
      } else {
        console.log(
          chalk.green("\n  Ready to go! Run `claude-trello run` to start.\n"),
        );
      }
    } catch (err) {
      spinner.fail(
        err instanceof Error ? err.message : "Failed to check status",
      );
      process.exit(1);
    }
  });
