import { z } from "zod";
import {
  tool,
  createSdkMcpServer,
} from "@anthropic-ai/claude-agent-sdk";
import {
  getIssue,
  updateIssueBody,
  closeIssue,
  addComment,
  createPullRequest,
} from "./client";
import { toggleTaskItem } from "./parser";

/**
 * Create MCP tools for GitHub issue interaction.
 * Used by Claude sessions operating on GitHub issues.
 */
export function createGitHubMcpTools(
  token: string,
  owner: string,
  repo: string,
) {
  const checkGitHubTask = tool(
    "check_github_task",
    "Mark a task list item in a GitHub issue as complete. The task is identified by its 0-based index in the issue body's task list.",
    {
      issueNumber: z.number().describe("The GitHub issue number"),
      taskIndex: z
        .number()
        .describe("0-based index of the task item in the issue body"),
    },
    async ({ issueNumber, taskIndex }) => {
      const issue = await getIssue(token, owner, repo, issueNumber);
      if (!issue.body) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Issue #${issueNumber} has no body`,
            },
          ],
        };
      }
      const updated = toggleTaskItem(issue.body, taskIndex, true);
      await updateIssueBody(token, owner, repo, issueNumber, updated);
      return {
        content: [
          {
            type: "text" as const,
            text: `Checked task ${taskIndex} on issue #${issueNumber}`,
          },
        ],
      };
    },
  );

  const closeGitHubIssue = tool(
    "close_github_issue",
    "Close a GitHub issue after all its task list items are completed.",
    {
      issueNumber: z.number().describe("The GitHub issue number to close"),
    },
    async ({ issueNumber }) => {
      await closeIssue(token, owner, repo, issueNumber);
      return {
        content: [
          {
            type: "text" as const,
            text: `Closed issue #${issueNumber}`,
          },
        ],
      };
    },
  );

  const commentOnIssue = tool(
    "comment_on_issue",
    "Add a comment to a GitHub issue to report progress or findings.",
    {
      issueNumber: z.number().describe("The GitHub issue number"),
      body: z.string().describe("The comment body (markdown)"),
    },
    async ({ issueNumber, body }) => {
      await addComment(token, owner, repo, issueNumber, body);
      return {
        content: [
          {
            type: "text" as const,
            text: `Commented on issue #${issueNumber}`,
          },
        ],
      };
    },
  );

  const createPR = tool(
    "create_pull_request",
    "Create a pull request for the changes you've made. Call this after completing all issues.",
    {
      title: z.string().describe("PR title"),
      body: z.string().describe("PR body (markdown)"),
      head: z
        .string()
        .describe("The branch containing changes (e.g. 'feature-branch')"),
      base: z
        .string()
        .describe("The branch to merge into (e.g. 'main')"),
    },
    async ({ title, body, head, base }) => {
      const pr = await createPullRequest(
        token,
        owner,
        repo,
        title,
        body,
        head,
        base,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Created PR #${pr.number}: ${pr.html_url}`,
          },
        ],
      };
    },
  );

  const server = createSdkMcpServer({
    name: "github-tools",
    tools: [checkGitHubTask, closeGitHubIssue, commentOnIssue, createPR],
  });

  return {
    server,
    allowedTools: [
      "mcp__github-tools__check_github_task",
      "mcp__github-tools__close_github_issue",
      "mcp__github-tools__comment_on_issue",
      "mcp__github-tools__create_pull_request",
    ],
  };
}
