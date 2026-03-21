import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { registerCommand } from "./commands/register.js";
import { setupCommand } from "./commands/setup.js";
import { logoutCommand } from "./commands/logout.js";
import { runCommand } from "./commands/run.js";
import { boardsCommand } from "./commands/boards.js";
import { statusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("claude-trello")
  .description(
    "Bridge Trello boards and Claude Code — work through tasks from your terminal",
  )
  .version("0.1.0");

program.addCommand(registerCommand);
program.addCommand(loginCommand);
program.addCommand(setupCommand);
program.addCommand(logoutCommand);
program.addCommand(runCommand);
program.addCommand(boardsCommand);
program.addCommand(statusCommand);

program.parse();
