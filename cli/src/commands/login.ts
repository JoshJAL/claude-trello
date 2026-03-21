import { Command } from "commander";
import { input, password } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { signIn } from "../lib/api.js";
import { saveConfig, getServerUrl } from "../lib/config.js";

export const loginCommand = new Command("login")
  .description("Sign in to Claude Trello Bridge")
  .option("-s, --server <url>", "Server URL (default: https://ct.joshualevine.me)")
  .action(async (opts: { server?: string }) => {
    const serverUrl = opts.server || getServerUrl();

    console.log(chalk.bold("Sign in to Claude Trello Bridge"));
    console.log(chalk.dim(`Server: ${serverUrl}\n`));

    const email = await input({ message: "Email:" });
    const pass = await password({ message: "Password:" });

    const spinner = ora("Signing in...").start();

    try {
      const { cookies, user } = await signIn(serverUrl, email, pass);

      saveConfig({
        serverUrl,
        sessionCookie: cookies,
        userEmail: user.email,
        userName: user.name,
      });

      spinner.succeed(
        `Signed in as ${chalk.bold(user.name)} (${user.email})`,
      );
    } catch (err) {
      spinner.fail(err instanceof Error ? err.message : "Sign-in failed");
      process.exit(1);
    }
  });
