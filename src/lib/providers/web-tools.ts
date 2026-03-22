/**
 * Web mode tool set — file operations via GitHub/GitLab APIs.
 * Replaces local filesystem tools (read_file, write_file, etc.) with API calls.
 */

import type { ToolDefinition } from "./tools.js";
import type { ToolSet } from "./source-tools.js";
import {
  getFileContent as getGitHubFile,
  createOrUpdateFile as ghCreateOrUpdate,
  getTree as getGitHubTree,
  searchCode as ghSearchCode,
  createBranch as ghCreateBranch,
  getDefaultBranch as ghGetDefaultBranch,
} from "#/lib/github/files";
import {
  getFileContent as getGitLabFile,
  createCommit as glCreateCommit,
  getTree as getGitLabTree,
  searchBlobs as glSearchBlobs,
  createBranch as glCreateBranch,
  getDefaultBranch as glGetDefaultBranch,
} from "#/lib/gitlab/files";

export interface WebToolContext {
  source: "github" | "gitlab" | "trello";
  sourceToken: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabProjectId?: number;
  workingBranch?: string;
  defaultBranch?: string;
  /** GitHub SHA tracking for file updates */
  fileShas: Map<string, string>;
}

const WEB_CODING_TOOLS: ToolDefinition[] = [
  {
    name: "read_file",
    description:
      "Read the contents of a file from the repository. Returns the file text with line numbers.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to the repository root",
        },
        offset: {
          type: "number",
          description: "Start reading from this line number (1-based)",
        },
        limit: {
          type: "number",
          description: "Maximum number of lines to read",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Write content to a file in the repository. Creates or overwrites the file on the working branch.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to the repository root",
        },
        content: { type: "string", description: "The full file content" },
        message: {
          type: "string",
          description:
            "Commit message for this change (defaults to 'Update <path>')",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description:
      "Replace an exact string in a file with new text. The old_text must match exactly. Commits the change to the working branch.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to the repository root",
        },
        old_text: {
          type: "string",
          description: "The exact text to find and replace",
        },
        new_text: {
          type: "string",
          description: "The replacement text",
        },
        message: {
          type: "string",
          description: "Commit message for this change",
        },
      },
      required: ["path", "old_text", "new_text"],
    },
  },
  {
    name: "list_files",
    description:
      "List files in the repository. Returns file paths from the repo tree.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Directory path to list (empty or omit for root). Only applicable for GitLab.",
        },
        recursive: {
          type: "boolean",
          description: "Whether to list recursively (default: true)",
        },
      },
    },
  },
  {
    name: "search_files",
    description:
      "Search for a text pattern in repository files. Uses the platform's code search API.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query / text pattern to find",
        },
      },
      required: ["query"],
    },
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function addLineNumbers(
  content: string,
  offset?: number,
  limit?: number,
): string {
  const lines = content.split("\n");
  const start = Math.max(0, (offset ?? 1) - 1);
  const end = limit ? start + limit : lines.length;
  const slice = lines.slice(start, end);
  return slice
    .map((line, i) => `${String(start + i + 1).padStart(5)} ${line}`)
    .join("\n");
}

async function ensureWorkingBranch(ctx: WebToolContext): Promise<string> {
  if (ctx.workingBranch) return ctx.workingBranch;

  // Create a working branch on first write
  const branchType = ctx.issueTitle.toLowerCase().includes('fix') ? 'bug' : 'feature';
  const providerName = ctx.providerName.toLowerCase();
  const summary = ctx.issueTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
  const branchName = `${branchType}/${providerName}-${summary}`;

  if (ctx.source === "github" && ctx.githubOwner && ctx.githubRepo) {
    if (!ctx.defaultBranch) {
      ctx.defaultBranch = await ghGetDefaultBranch(
        ctx.sourceToken,
        ctx.githubOwner,
        ctx.githubRepo,
      );
    }
    await ghCreateBranch(
      ctx.sourceToken,
      ctx.githubOwner,
      ctx.githubRepo,
      branchName,
      ctx.defaultBranch,
    );
  } else if (ctx.source === "gitlab" && ctx.gitlabProjectId) {
    if (!ctx.defaultBranch) {
      ctx.defaultBranch = await glGetDefaultBranch(
        ctx.sourceToken,
        ctx.gitlabProjectId,
      );
    }
    await glCreateBranch(
      ctx.sourceToken,
      ctx.gitlabProjectId,
      branchName,
      ctx.defaultBranch,
    );
  }

  ctx.workingBranch = branchName;
  return branchName;
}

// ── GitHub Tool Execution ──────────────────────────────────────────────────

async function executeGitHubTool(
  name: string,
  input: Record<string, unknown>,
  ctx: WebToolContext,
): Promise<string> {
  const { sourceToken: token, githubOwner: owner, githubRepo: repo } = ctx;
  if (!owner || !repo) return "Error: GitHub owner/repo not configured";

  switch (name) {
    case "read_file": {
      try {
        const ref = ctx.workingBranch ?? ctx.defaultBranch;
        const { content, sha } = await getGitHubFile(
          token,
          owner,
          repo,
          input.path as string,
          ref,
        );
        ctx.fileShas.set(input.path as string, sha);
        return addLineNumbers(
          content,
          input.offset as number | undefined,
          input.limit as number | undefined,
        );
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to read file"}`;
      }
    }
    case "write_file": {
      try {
        const branch = await ensureWorkingBranch(ctx);
        const sha = ctx.fileShas.get(input.path as string);
        const message =
          (input.message as string) ?? `Update ${input.path as string}`;
        const result = await ghCreateOrUpdate(
          token,
          owner,
          repo,
          input.path as string,
          input.content as string,
          message,
          sha,
          branch,
        );
        ctx.fileShas.set(input.path as string, result.sha);
        return `File written: ${input.path} (branch: ${branch})`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to write file"}`;
      }
    }
    case "edit_file": {
      try {
        const ref = ctx.workingBranch ?? ctx.defaultBranch;
        const { content, sha } = await getGitHubFile(
          token,
          owner,
          repo,
          input.path as string,
          ref,
        );

        const oldText = input.old_text as string;
        const newText = input.new_text as string;

        if (!content.includes(oldText)) {
          return `old_text not found in ${input.path}. Make sure it matches exactly.`;
        }

        const count = content.split(oldText).length - 1;
        if (count > 1) {
          return `old_text matches ${count} locations in ${input.path}. Provide more context to make it unique.`;
        }

        const updated = content.replace(oldText, newText);
        const branch = await ensureWorkingBranch(ctx);
        const message =
          (input.message as string) ?? `Edit ${input.path as string}`;
        const result = await ghCreateOrUpdate(
          token,
          owner,
          repo,
          input.path as string,
          updated,
          message,
          sha,
          branch,
        );
        ctx.fileShas.set(input.path as string, result.sha);
        return `File edited: ${input.path} (branch: ${branch})`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to edit file"}`;
      }
    }
    case "list_files": {
      try {
        const ref = ctx.workingBranch ?? ctx.defaultBranch;
        const recursive = (input.recursive as boolean) !== false;
        const entries = await getGitHubTree(
          token,
          owner,
          repo,
          ref,
          recursive,
        );
        const files = entries
          .filter((e) => e.type === "blob")
          .map((e) => e.path);
        return files.join("\n") || "No files found";
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to list files"}`;
      }
    }
    case "search_files": {
      try {
        const results = await ghSearchCode(
          token,
          owner,
          repo,
          input.query as string,
        );
        if (results.length === 0) return "No matches found";
        return results
          .map((r) => {
            const fragments =
              r.text_matches?.map((m) => m.fragment).join("\n") ?? "";
            return `${r.path}:\n${fragments}`;
          })
          .join("\n\n");
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Search failed"}`;
      }
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

// ── GitLab Tool Execution ──────────────────────────────────────────────────

async function executeGitLabTool(
  name: string,
  input: Record<string, unknown>,
  ctx: WebToolContext,
): Promise<string> {
  const { sourceToken: token, gitlabProjectId: projectId } = ctx;
  if (!projectId) return "Error: GitLab projectId not configured";

  switch (name) {
    case "read_file": {
      try {
        const ref = ctx.workingBranch ?? ctx.defaultBranch;
        const { content } = await getGitLabFile(
          token,
          projectId,
          input.path as string,
          ref,
        );
        return addLineNumbers(
          content,
          input.offset as number | undefined,
          input.limit as number | undefined,
        );
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to read file"}`;
      }
    }
    case "write_file": {
      try {
        const branch = await ensureWorkingBranch(ctx);
        const message =
          (input.message as string) ?? `Update ${input.path as string}`;

        // Check if file exists to determine create vs update action
        let action: "create" | "update" = "create";
        try {
          await getGitLabFile(token, projectId, input.path as string, branch);
          action = "update";
        } catch {
          // File doesn't exist, will create
        }

        await glCreateCommit(token, projectId, branch, message, [
          {
            action,
            file_path: input.path as string,
            content: input.content as string,
          },
        ]);
        return `File written: ${input.path} (branch: ${branch})`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to write file"}`;
      }
    }
    case "edit_file": {
      try {
        const ref = ctx.workingBranch ?? ctx.defaultBranch;
        const { content } = await getGitLabFile(
          token,
          projectId,
          input.path as string,
          ref,
        );

        const oldText = input.old_text as string;
        const newText = input.new_text as string;

        if (!content.includes(oldText)) {
          return `old_text not found in ${input.path}. Make sure it matches exactly.`;
        }

        const count = content.split(oldText).length - 1;
        if (count > 1) {
          return `old_text matches ${count} locations in ${input.path}. Provide more context to make it unique.`;
        }

        const updated = content.replace(oldText, newText);
        const branch = await ensureWorkingBranch(ctx);
        const message =
          (input.message as string) ?? `Edit ${input.path as string}`;

        await glCreateCommit(token, projectId, branch, message, [
          {
            action: "update",
            file_path: input.path as string,
            content: updated,
          },
        ]);
        return `File edited: ${input.path} (branch: ${branch})`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to edit file"}`;
      }
    }
    case "list_files": {
      try {
        const ref = ctx.workingBranch ?? ctx.defaultBranch;
        const recursive = (input.recursive as boolean) !== false;
        const entries = await getGitLabTree(
          token,
          projectId,
          input.path as string | undefined,
          ref,
          recursive,
        );
        const files = entries
          .filter((e) => e.type === "blob")
          .map((e) => e.path);
        return files.join("\n") || "No files found";
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to list files"}`;
      }
    }
    case "search_files": {
      try {
        const results = await glSearchBlobs(
          token,
          projectId,
          input.query as string,
        );
        if (results.length === 0) return "No matches found";
        return results
          .map((r) => `${r.path}:${r.startline}\n${r.data}`)
          .join("\n\n");
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Search failed"}`;
      }
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

// ── Trello advisory (no file ops) ──────────────────────────────────────────

function executeTrelloWebTool(name: string): string {
  return `Tool "${name}" is not available in web mode for Trello. Use the CLI for full codebase access. You can still analyze tasks and provide code suggestions.`;
}

// ── Public ──────────────────────────────────────────────────────────────────

export function createWebToolSet(ctx: WebToolContext): ToolSet {
  const definitions = [...WEB_CODING_TOOLS];

  const execute = async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string> => {
    try {
      if (ctx.source === "github") {
        return await executeGitHubTool(name, input, ctx);
      }
      if (ctx.source === "gitlab") {
        return await executeGitLabTool(name, input, ctx);
      }
      // Trello web mode: no file operations
      return executeTrelloWebTool(name);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return `Error in ${name}: ${error.message}\n${error.stack ?? ""}`;
    }
  };

  return { definitions, execute };
}
