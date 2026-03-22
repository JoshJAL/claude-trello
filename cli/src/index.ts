import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { registerCommand } from "./commands/register.js";
import { setupCommand } from "./commands/setup.js";
import { logoutCommand } from "./commands/logout.js";
import { runCommand } from "./commands/run.js";
import { boardsCommand } from "./commands/boards.js";
import { reposCommand } from "./commands/repos.js";
import { statusCommand } from "./commands/status.js";
import { historyCommand } from "./commands/history.js";
import { usageCommand } from "./commands/usage.js";

const program = new Command();

program
  .name("taskpilot")
  .description(
    "Point AI coding agents at task boards — work through items from your terminal",
  )
  .version("0.1.0");

program.addCommand(registerCommand);
program.addCommand(loginCommand);
program.addCommand(setupCommand);
program.addCommand(logoutCommand);
program.addCommand(runCommand);
program.addCommand(boardsCommand);
program.addCommand(reposCommand);
program.addCommand(statusCommand);
program.addCommand(historyCommand);
program.addCommand(usageCommand);

program.parse();
