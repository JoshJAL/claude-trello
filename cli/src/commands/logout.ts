import { Command } from "commander";
import chalk from "chalk";
import { clearConfig, isLoggedIn, getConfig } from "../lib/config.js";

export const logoutCommand = new Command("logout")
  .description("Sign out and clear stored session")
  .action(() => {
    if (!isLoggedIn()) {
      console.log(chalk.dim("Not currently logged in."));
      return;
    }

    const config = getConfig();
    clearConfig();
    console.log(
      chalk.green(
        `Signed out${config.userEmail ? ` (${config.userEmail})` : ""}.`,
      ),
    );
  });
