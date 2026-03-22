import { Command } from "commander";
import { input, password } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { signUp } from "../lib/api.js";
import { saveConfig, getServerUrl } from "../lib/config.js";

export const registerCommand = new Command("register")
  .description("Create a new TaskPilot account")
  .option("-s, --server <url>", "Server URL (default: https://ct.joshualevine.me)")
  .action(async (opts: { server?: string }) => {
    const serverUrl = opts.server || getServerUrl();

    console.log(chalk.bold("Create a TaskPilot account"));
    console.log(chalk.dim(`Server: ${serverUrl}\n`));

    const name = await input({ message: "Name:" });
    const email = await input({ message: "Email:" });
    const pass = await password({ message: "Password (min 8 characters):" });

    if (pass.length < 8) {
      console.log(chalk.red("Password must be at least 8 characters."));
      process.exit(1);
    }

    const spinner = ora("Creating account...").start();

    try {
      const { cookies, user } = await signUp(serverUrl, name, email, pass);

      saveConfig({
        serverUrl,
        sessionCookie: cookies,
        userEmail: user.email,
        userName: user.name,
      });

      spinner.succeed(
        `Account created! Signed in as ${chalk.bold(user.name)} (${user.email})`,
      );
      console.log(
        chalk.dim(
          "\n  Run `taskpilot setup` to connect Trello and add your API key.\n",
        ),
      );
    } catch (err) {
      spinner.fail(err instanceof Error ? err.message : "Registration failed");
      process.exit(1);
    }
  });
