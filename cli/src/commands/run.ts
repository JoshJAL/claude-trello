import { resolve } from "path";
import { Command } from "commander";
import { select, confirm, input } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { getBoards, getBoardData, getCredentials } from "../lib/api.js";
import { isLoggedIn } from "../lib/config.js";
import { launchSession } from "../lib/runner.js";
import type { Query } from "../lib/runner.js";
import type { BoardData, TrelloCard, TrelloList } from "../lib/types.js";

export const runCommand = new Command("run")
  .description("Select a Trello board and start a Claude Code session")
  .option("-b, --board <id>", "Board ID (skip interactive selection)")
  .option("-d, --dir <path>", "Working directory (default: current)")
  .action(async (opts: { board?: string; dir?: string }) => {
    if (!isLoggedIn()) {
      console.log(
        chalk.red("Not logged in. Run `claude-trello login` first."),
      );
      process.exit(1);
    }

    const cwd = opts.dir ? resolve(opts.dir) : process.cwd();

    // ── Select board ──────────────────────────────────────────────────
    let boardId = opts.board;
    let boardName = "";

    if (!boardId) {
      const spinner = ora("Fetching boards...").start();
      let boards;
      try {
        boards = await getBoards();
        spinner.stop();
      } catch (err) {
        spinner.fail(
          err instanceof Error ? err.message : "Failed to fetch boards",
        );
        process.exit(1);
      }

      if (boards.length === 0) {
        console.log(
          chalk.red("No boards found. Create a board on Trello first."),
        );
        process.exit(1);
      }

      boardId = await select({
        message: "Select a board:",
        choices: boards.map((b) => ({
          name: b.name,
          value: b.id,
          description: b.desc?.slice(0, 60) || undefined,
        })),
      });
      boardName = boards.find((b) => b.id === boardId)?.name ?? boardId;
    }

    // ── Fetch board data ──────────────────────────────────────────────
    const dataSpinner = ora("Fetching cards and checklists...").start();
    let cardsResponse;
    try {
      cardsResponse = await getBoardData(boardId);
      dataSpinner.stop();
    } catch (err) {
      dataSpinner.fail(
        err instanceof Error ? err.message : "Failed to fetch board data",
      );
      process.exit(1);
    }

    const { cards, lists, doneListId } = cardsResponse;
    if (!boardName) boardName = boardId;

    // ── Display board overview ────────────────────────────────────────
    console.log(`\n${chalk.bold(boardName)}`);
    console.log(chalk.dim("\u2500".repeat(boardName.length)));

    const doneCards = doneListId
      ? cards.filter((c) => c.idList === doneListId)
      : [];
    const activeCards = doneListId
      ? cards.filter((c) => c.idList !== doneListId)
      : cards;

    const listMap = new Map<string, TrelloList>();
    for (const l of lists) listMap.set(l.id, l);

    const byList = new Map<string, TrelloCard[]>();
    for (const card of activeCards) {
      const existing = byList.get(card.idList) ?? [];
      existing.push(card);
      byList.set(card.idList, existing);
    }

    for (const [listId, listCards] of byList) {
      const listName = listMap.get(listId)?.name ?? "Unknown";
      console.log(
        `\n  ${chalk.cyan.bold(listName)} (${listCards.length} card${listCards.length === 1 ? "" : "s"}):`,
      );
      for (const card of listCards) {
        const total = card.checklists.reduce(
          (sum, cl) => sum + cl.checkItems.length,
          0,
        );
        const done = card.checklists.reduce(
          (sum, cl) =>
            sum + cl.checkItems.filter((i) => i.state === "complete").length,
          0,
        );
        const progress = total > 0 ? ` [${done}/${total}]` : "";
        console.log(
          `    ${chalk.white("\u2022")} ${card.name}${chalk.dim(progress)}`,
        );
      }
    }

    if (doneCards.length > 0) {
      console.log(
        `\n  ${chalk.dim(`Done (${doneCards.length} card${doneCards.length === 1 ? "" : "s"}) [skipped]`)}`,
      );
    }

    if (activeCards.length === 0) {
      console.log(chalk.dim("\n  No active cards to work on."));
      return;
    }

    console.log(`\n  ${chalk.dim(`Working directory: ${cwd}`)}`);

    const proceed = await confirm({
      message: `Start Claude Code session? (${activeCards.length} active card${activeCards.length === 1 ? "" : "s"})`,
      default: true,
    });

    if (!proceed) {
      console.log(chalk.dim("Cancelled."));
      return;
    }

    // ── Load credentials ──────────────────────────────────────────────
    const credSpinner = ora("Loading credentials...").start();
    let credentials;
    try {
      credentials = await getCredentials();
      credSpinner.succeed("Credentials loaded");
    } catch (err) {
      credSpinner.fail(
        err instanceof Error ? err.message : "Failed to load credentials",
      );
      process.exit(1);
    }

    // ── Launch session ────────────────────────────────────────────────
    const boardData: BoardData = {
      board: { id: boardId, name: boardName },
      cards,
      doneListId: doneListId ?? undefined,
    };

    console.log(`\n${chalk.bold.blue("Starting Claude Code session...")}\n`);

    const abortController = new AbortController();

    const sigintHandler = () => {
      console.log(chalk.dim("\n\nAborting session..."));
      abortController.abort();
    };
    process.on("SIGINT", sigintHandler);

    try {
      const session = launchSession({
        credentials,
        boardData,
        cwd,
        abortController,
      });

      for await (const message of session) {
        await handleMessage(message, session);
      }

      console.log(`\n${chalk.green.bold("Session complete.")}\n`);
    } catch (err) {
      if (abortController.signal.aborted) {
        console.log(chalk.dim("\nSession aborted."));
      } else {
        console.error(
          chalk.red(
            `\nSession error: ${err instanceof Error ? err.message : "Unknown error"}`,
          ),
        );
        process.exit(1);
      }
    } finally {
      process.removeListener("SIGINT", sigintHandler);
    }
  });

// Use a loose type for message contents since the SDK types are complex unions
interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface MessagePayload {
  content?: ContentBlock[];
}

/**
 * Process a message from the Claude session and render it to the terminal.
 */
async function handleMessage(
  message: { type: string; [key: string]: unknown },
  session: Query,
): Promise<void> {
  switch (message.type) {
    case "system": {
      if (message.subtype === "init") {
        console.log(
          chalk.dim(
            `  Session initialized (model: ${message.model as string})\n`,
          ),
        );
      }
      break;
    }

    case "assistant": {
      const msg = message.message as MessagePayload | undefined;
      const content = msg?.content;
      if (!Array.isArray(content)) break;

      for (const block of content) {
        if (block.type === "text" && block.text) {
          console.log(block.text);
        } else if (block.type === "tool_use" && block.name) {
          const name = block.name;
          const toolInput = block.input ?? {};

          if (name === "mcp__trello-tools__check_trello_item") {
            console.log(chalk.green(`  \u2713 Checked item on Trello`));
          } else if (name === "mcp__trello-tools__move_card_to_done") {
            console.log(chalk.green.bold(`  \u2713 Moved card to Done`));
          } else if (name === "AskUserQuestion") {
            const questions = toolInput.questions as
              | Array<{ question: string }>
              | undefined;
            if (questions && questions.length > 0) {
              const questionText = questions
                .map((q) => q.question)
                .join("\n");
              console.log(chalk.yellow(`\n  ? ${questionText}\n`));

              const answer = await input({ message: ">" });

              async function* userInput() {
                yield {
                  type: "user" as const,
                  message: {
                    role: "user" as const,
                    content: answer,
                  },
                  parent_tool_use_id: null,
                  session_id: "",
                };
              }
              await session.streamInput(userInput());
            }
          } else {
            console.log(chalk.dim(`  [${name}]`));
          }
        }
      }
      break;
    }

    case "result": {
      const result = (message.result ?? message.subtype) as string;
      console.log(chalk.dim(`\n  Result: ${result}`));
      break;
    }
  }
}
