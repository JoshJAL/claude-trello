import { exec } from "child_process";
import { Command } from "commander";
import { password, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import {
  getIntegrationStatus,
  getTrelloAuthUrl,
  saveApiKey,
} from "../lib/api.js";
import { isLoggedIn, getServerUrl } from "../lib/config.js";

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  exec(`${cmd} ${JSON.stringify(url)}`);
}

async function pollForTrello(
  timeoutMs: number = 120_000,
  intervalMs: number = 2_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const status = await getIntegrationStatus();
      if (status.trelloLinked) return true;
    } catch {
      // Server may be briefly unavailable, keep polling
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

export const setupCommand = new Command("setup")
  .description("Connect Trello and save your Anthropic API key")
  .action(async () => {
    if (!isLoggedIn()) {
      console.log(
        chalk.red(
          "Not logged in. Run `taskpilot register` or `taskpilot login` first.",
        ),
      );
      process.exit(1);
    }

    console.log(chalk.bold("\nTaskPilot — Setup\n"));

    const statusSpinner = ora("Checking current status...").start();
    let status;
    try {
      status = await getIntegrationStatus();
      statusSpinner.stop();
    } catch (err) {
      statusSpinner.fail(
        err instanceof Error ? err.message : "Failed to check status",
      );
      process.exit(1);
    }

    // ── Step 1: Trello ──────────────────────────────────────────────
    if (status.trelloLinked) {
      console.log(
        `  ${chalk.green("1.")} Trello ${chalk.green("Connected")}`,
      );
    } else {
      console.log(
        `  ${chalk.yellow("1.")} Trello ${chalk.yellow("Not connected")}\n`,
      );

      const proceed = await confirm({
        message:
          "Open your browser to connect Trello? (you'll authorize and be redirected back)",
        default: true,
      });

      if (!proceed) {
        console.log(chalk.dim("Setup cancelled."));
        return;
      }

      const urlSpinner = ora("Getting Trello authorization URL...").start();
      let authUrl: string;
      try {
        authUrl = await getTrelloAuthUrl();
        urlSpinner.stop();
      } catch (err) {
        urlSpinner.fail(
          err instanceof Error ? err.message : "Failed to get auth URL",
        );
        process.exit(1);
      }

      console.log(chalk.dim(`\n  Opening: ${authUrl}\n`));
      openBrowser(authUrl);
      console.log(
        chalk.dim(
          "  Authorize the app on Trello, then come back here.\n" +
            "  If the browser didn't open, copy the URL above manually.\n",
        ),
      );

      const pollSpinner = ora(
        "Waiting for Trello connection (up to 2 minutes)...",
      ).start();
      const connected = await pollForTrello();

      if (connected) {
        pollSpinner.succeed("Trello connected!");
      } else {
        pollSpinner.fail(
          "Timed out waiting for Trello connection. Run `taskpilot setup` to try again.",
        );
        process.exit(1);
      }
    }

    // ── Step 2: Anthropic API Key ───────────────────────────────────
    if (status.hasApiKey) {
      console.log(
        `  ${chalk.green("2.")} Anthropic API Key ${chalk.green("Configured")}`,
      );
    } else {
      console.log(
        `\n  ${chalk.yellow("2.")} Anthropic API Key ${chalk.yellow("Not set")}\n`,
      );
      console.log(
        chalk.dim(
          "  Get your key from https://console.anthropic.com/settings/keys\n",
        ),
      );

      const apiKey = await password({
        message: "Paste your Anthropic API key (sk-ant-api03-...):",
      });

      if (!apiKey.startsWith("sk-ant-api03-")) {
        console.log(
          chalk.red('Invalid key format. Must start with "sk-ant-api03-".'),
        );
        process.exit(1);
      }

      const keySpinner = ora("Saving API key...").start();
      try {
        await saveApiKey(apiKey);
        keySpinner.succeed("API key saved (encrypted on server)");
      } catch (err) {
        keySpinner.fail(
          err instanceof Error ? err.message : "Failed to save API key",
        );
        process.exit(1);
      }
    }

    const serverUrl = getServerUrl();
    console.log(
      chalk.green.bold(
        "\n  All set! Run `taskpilot run` to start a session.\n",
      ),
    );
    console.log(
      chalk.dim(
        `  You can manage your settings anytime at ${serverUrl}/settings\n`,
      ),
    );
  });
