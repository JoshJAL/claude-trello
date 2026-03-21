import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { getBoards } from "../lib/api.js";
import { isLoggedIn } from "../lib/config.js";

export const boardsCommand = new Command("boards")
  .description("List your Trello boards")
  .action(async () => {
    if (!isLoggedIn()) {
      console.log(
        chalk.red("Not logged in. Run `claude-trello login` first."),
      );
      process.exit(1);
    }

    const spinner = ora("Fetching boards...").start();

    try {
      const boards = await getBoards();
      spinner.stop();

      if (boards.length === 0) {
        console.log(chalk.dim("No boards found."));
        return;
      }

      console.log(chalk.bold(`\nYour Trello Boards (${boards.length}):\n`));

      for (const board of boards) {
        console.log(`  ${chalk.cyan(board.name)}  ${chalk.dim(board.id)}`);
        if (board.desc) {
          console.log(`  ${chalk.dim(board.desc.slice(0, 80))}`);
        }
        console.log();
      }
    } catch (err) {
      spinner.fail(
        err instanceof Error ? err.message : "Failed to fetch boards",
      );
      process.exit(1);
    }
  });
