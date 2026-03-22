import { z } from "zod";
import {
  tool,
  createSdkMcpServer,
} from "@anthropic-ai/claude-agent-sdk";
import {
  getIssue,
  updateIssueDescription,
  closeIssue,
  addNote,
  createMergeRequest,
} from "./client";
import { toggleTaskItem } from "./parser";

/**
 * Create MCP tools for GitLab issue interaction.
 * Used by Claude sessions operating on GitLab issues.
 */
export function createGitLabMcpTools(
  token: string,
  projectId: number,
) {
  const checkGitLabTask = tool(
    "check_gitlab_task",
    "Mark a task list item in a GitLab issue as complete. The task is identified by its 0-based index in the issue description's task list.",
    {
      issueIid: z.number().describe("The GitLab issue IID (project-scoped number)"),
      taskIndex: z
        .number()
        .describe("0-based index of the task item in the issue description"),
    },
    async ({ issueIid, taskIndex }) => {
      const issue = await getIssue(token, projectId, issueIid);
      if (!issue.description) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Issue #${issueIid} has no description`,
            },
          ],
        };
      }
      const updated = toggleTaskItem(issue.description, taskIndex, true);
      await updateIssueDescription(token, projectId, issueIid, updated);
      return {
        content: [
          {
            type: "text" as const,
            text: `Checked task ${taskIndex} on issue #${issueIid}`,
          },
        ],
      };
    },
  );

  const closeGitLabIssue = tool(
    "close_gitlab_issue",
    "Close a GitLab issue after all its task list items are completed.",
    {
      issueIid: z.number().describe("The GitLab issue IID to close"),
    },
    async ({ issueIid }) => {
      await closeIssue(token, projectId, issueIid);
      return {
        content: [
          {
            type: "text" as const,
            text: `Closed issue #${issueIid}`,
          },
        ],
      };
    },
  );

  const commentOnIssue = tool(
    "comment_on_issue",
    "Add a note/comment to a GitLab issue to report progress or findings.",
    {
      issueIid: z.number().describe("The GitLab issue IID"),
      body: z.string().describe("The note body (markdown)"),
    },
    async ({ issueIid, body }) => {
      await addNote(token, projectId, issueIid, body);
      return {
        content: [
          {
            type: "text" as const,
            text: `Commented on issue #${issueIid}`,
          },
        ],
      };
    },
  );

  const createMR = tool(
    "create_merge_request",
    "Create a merge request for the changes you've made. Call this after completing all issues.",
    {
      title: z.string().describe("MR title"),
      description: z.string().describe("MR description (markdown)"),
      sourceBranch: z
        .string()
        .describe("The branch containing changes (e.g. 'feature-branch')"),
      targetBranch: z
        .string()
        .describe("The branch to merge into (e.g. 'main')"),
    },
    async ({ title, description, sourceBranch, targetBranch }) => {
      const mr = await createMergeRequest(
        token,
        projectId,
        title,
        description,
        sourceBranch,
        targetBranch,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Created MR !${mr.iid}: ${mr.web_url}`,
          },
        ],
      };
    },
  );

  const server = createSdkMcpServer({
    name: "gitlab-tools",
    tools: [checkGitLabTask, closeGitLabIssue, commentOnIssue, createMR],
  });

  return {
    server,
    allowedTools: [
      "mcp__gitlab-tools__check_gitlab_task",
      "mcp__gitlab-tools__close_gitlab_issue",
      "mcp__gitlab-tools__comment_on_issue",
      "mcp__gitlab-tools__create_merge_request",
    ],
  };
}
