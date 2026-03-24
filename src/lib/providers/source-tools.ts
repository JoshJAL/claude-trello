/**
 * Source-specific tool sets for the generic agent loop.
 * Extracts Trello/GitHub/GitLab task management tools into reusable ToolSet builders.
 */

import type { ToolDefinition } from "./tools.js";
import {
  updateCheckItem,
  moveCard,
  findOrCreateVerifyList,
} from "#/lib/trello";
import {
  getIssue as getGitHubIssue,
  updateIssueBody,
  closeIssue as closeGitHubIssue,
  addComment as addGitHubComment,
  createPullRequest,
} from "#/lib/github/client";
import { toggleTaskItem } from "#/lib/tasks/parser";
import {
  getIssue as getGitLabIssue,
  updateIssueDescription,
  closeIssue as closeGitLabIssue,
  addNote,
  createMergeRequest,
} from "#/lib/gitlab/client";

export interface ToolSet {
  definitions: ToolDefinition[];
  execute: (name: string, input: Record<string, unknown>) => Promise<string>;
}

// Tools that count as "doing actual work" — must call at least one before checking off tasks
const CODING_TOOL_NAMES = new Set([
  "read_file", "write_file", "edit_file", "bash", "search_files", "list_files",
]);

// Tools that should be gated behind actual work being done
const TASK_CHECK_TOOLS = new Set([
  "check_trello_item", "move_card_to_verify",
  "check_github_task", "close_github_issue",
  "check_gitlab_task", "close_gitlab_issue",
]);

/**
 * Wraps a merged tool set to enforce that task-completion tools can only
 * be called after at least one coding tool (read/write/edit/search) has
 * been used. Prevents models from checking off all tasks without doing work.
 */
export function createGuardedToolSet(inner: ToolSet): ToolSet {
  let codingToolUsed = false;

  return {
    definitions: inner.definitions,
    execute: async (name: string, input: Record<string, unknown>) => {
      if (CODING_TOOL_NAMES.has(name)) {
        codingToolUsed = true;
      }

      if (TASK_CHECK_TOOLS.has(name) && !codingToolUsed) {
        return `Error: You must read, write, or edit at least one file before marking tasks as complete. Use read_file, list_files, or search_files to explore the codebase first, then make the necessary code changes.`;
      }

      return inner.execute(name, input);
    },
  };
}

// ── Trello ─────────────────────────────────────────────────────────────────

export function createTrelloToolSet(
  trelloToken: string,
  boardId: string,
): ToolSet {
  const definitions: ToolDefinition[] = [
    {
      name: "check_trello_item",
      description:
        "Mark a Trello checklist item as complete once the corresponding code task is done.",
      parameters: {
        type: "object",
        properties: {
          checkItemId: {
            type: "string",
            description: "The Trello checklist item ID",
          },
          cardId: {
            type: "string",
            description: "The Trello card ID",
          },
        },
        required: ["checkItemId", "cardId"],
      },
    },
    {
      name: "move_card_to_verify",
      description:
        "Move a Trello card to the Verify list after all its checklist items are completed.",
      parameters: {
        type: "object",
        properties: {
          cardId: {
            type: "string",
            description: "The Trello card ID to move to Verify",
          },
        },
        required: ["cardId"],
      },
    },
  ];

  async function execute(
    name: string,
    input: Record<string, unknown>,
  ): Promise<string> {
    if (name === "check_trello_item") {
      await updateCheckItem(
        trelloToken,
        input.cardId as string,
        input.checkItemId as string,
        "complete",
      );
      return `Marked checklist item ${input.checkItemId} as complete on card ${input.cardId}`;
    }
    if (name === "move_card_to_verify") {
      const verifyListId = await findOrCreateVerifyList(trelloToken, boardId);
      await moveCard(trelloToken, input.cardId as string, verifyListId);
      return `Moved card ${input.cardId} to Verify list`;
    }
    return `Unknown Trello tool: ${name}`;
  }

  return { definitions, execute };
}

// ── GitHub ──────────────────────────────────────────────────────────────────

export function createGitHubSourceToolSet(
  token: string,
  owner: string,
  repo: string,
): ToolSet {
  const definitions: ToolDefinition[] = [
    {
      name: "check_github_task",
      description:
        "Mark a task list item in a GitHub issue as complete by its 0-based index.",
      parameters: {
        type: "object",
        properties: {
          issueNumber: {
            type: "number",
            description: "The GitHub issue number",
          },
          taskIndex: {
            type: "number",
            description: "0-based index of the task item in the issue body",
          },
        },
        required: ["issueNumber", "taskIndex"],
      },
    },
    {
      name: "close_github_issue",
      description:
        "Close a GitHub issue after all its task list items are completed.",
      parameters: {
        type: "object",
        properties: {
          issueNumber: {
            type: "number",
            description: "The GitHub issue number to close",
          },
        },
        required: ["issueNumber"],
      },
    },
    {
      name: "comment_on_issue",
      description: "Add a comment to a GitHub issue to report progress.",
      parameters: {
        type: "object",
        properties: {
          issueNumber: {
            type: "number",
            description: "The GitHub issue number",
          },
          body: { type: "string", description: "Comment body (markdown)" },
        },
        required: ["issueNumber", "body"],
      },
    },
    {
      name: "create_pull_request",
      description: "Create a pull request for the changes you've made.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "PR title" },
          body: { type: "string", description: "PR body (markdown)" },
          head: {
            type: "string",
            description: "Branch containing changes",
          },
          base: {
            type: "string",
            description: "Branch to merge into (e.g. 'main')",
          },
        },
        required: ["title", "body", "head", "base"],
      },
    },
  ];

  async function execute(
    name: string,
    input: Record<string, unknown>,
  ): Promise<string> {
    switch (name) {
      case "check_github_task": {
        const issue = await getGitHubIssue(
          token,
          owner,
          repo,
          input.issueNumber as number,
        );
        if (!issue.body) return `Issue #${input.issueNumber} has no body`;
        const updated = toggleTaskItem(
          issue.body,
          input.taskIndex as number,
          true,
        );
        await updateIssueBody(
          token,
          owner,
          repo,
          input.issueNumber as number,
          updated,
        );
        return `Checked task ${input.taskIndex} on issue #${input.issueNumber}`;
      }
      case "close_github_issue": {
        await closeGitHubIssue(
          token,
          owner,
          repo,
          input.issueNumber as number,
        );
        return `Closed issue #${input.issueNumber}`;
      }
      case "comment_on_issue": {
        await addGitHubComment(
          token,
          owner,
          repo,
          input.issueNumber as number,
          input.body as string,
        );
        return `Commented on issue #${input.issueNumber}`;
      }
      case "create_pull_request": {
        const pr = await createPullRequest(
          token,
          owner,
          repo,
          input.title as string,
          input.body as string,
          input.head as string,
          input.base as string,
        );
        return `Created PR #${pr.number}: ${pr.html_url}`;
      }
      default:
        return `Unknown GitHub tool: ${name}`;
    }
  }

  return { definitions, execute };
}

// ── GitLab ──────────────────────────────────────────────────────────────────

export function createGitLabSourceToolSet(
  token: string,
  projectId: number,
): ToolSet {
  const definitions: ToolDefinition[] = [
    {
      name: "check_gitlab_task",
      description:
        "Mark a task list item in a GitLab issue as complete by its 0-based index.",
      parameters: {
        type: "object",
        properties: {
          issueIid: {
            type: "number",
            description: "The GitLab issue IID (project-scoped)",
          },
          taskIndex: {
            type: "number",
            description:
              "0-based index of the task item in the issue description",
          },
        },
        required: ["issueIid", "taskIndex"],
      },
    },
    {
      name: "close_gitlab_issue",
      description:
        "Close a GitLab issue after all its task list items are completed.",
      parameters: {
        type: "object",
        properties: {
          issueIid: {
            type: "number",
            description: "The GitLab issue IID to close",
          },
        },
        required: ["issueIid"],
      },
    },
    {
      name: "comment_on_issue",
      description: "Add a note/comment to a GitLab issue to report progress.",
      parameters: {
        type: "object",
        properties: {
          issueIid: {
            type: "number",
            description: "The GitLab issue IID",
          },
          body: { type: "string", description: "Note body (markdown)" },
        },
        required: ["issueIid", "body"],
      },
    },
    {
      name: "create_merge_request",
      description: "Create a merge request for the changes you've made.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "MR title" },
          description: {
            type: "string",
            description: "MR description (markdown)",
          },
          sourceBranch: {
            type: "string",
            description: "Branch containing changes",
          },
          targetBranch: {
            type: "string",
            description: "Branch to merge into (e.g. 'main')",
          },
        },
        required: ["title", "description", "sourceBranch", "targetBranch"],
      },
    },
  ];

  async function execute(
    name: string,
    input: Record<string, unknown>,
  ): Promise<string> {
    switch (name) {
      case "check_gitlab_task": {
        const issue = await getGitLabIssue(
          token,
          projectId,
          input.issueIid as number,
        );
        if (!issue.description)
          return `Issue #${input.issueIid} has no description`;
        const updated = toggleTaskItem(
          issue.description,
          input.taskIndex as number,
          true,
        );
        await updateIssueDescription(
          token,
          projectId,
          input.issueIid as number,
          updated,
        );
        return `Checked task ${input.taskIndex} on issue #${input.issueIid}`;
      }
      case "close_gitlab_issue": {
        await closeGitLabIssue(
          token,
          projectId,
          input.issueIid as number,
        );
        return `Closed issue #${input.issueIid}`;
      }
      case "comment_on_issue": {
        await addNote(
          token,
          projectId,
          input.issueIid as number,
          input.body as string,
        );
        return `Commented on issue #${input.issueIid}`;
      }
      case "create_merge_request": {
        const mr = await createMergeRequest(
          token,
          projectId,
          input.title as string,
          input.description as string,
          input.sourceBranch as string,
          input.targetBranch as string,
        );
        return `Created MR !${mr.iid}: ${mr.web_url}`;
      }
      default:
        return `Unknown GitLab tool: ${name}`;
    }
  }

  return { definitions, execute };
}
