import {
  query,
  tool,
  createSdkMcpServer,
} from "@anthropic-ai/claude-agent-sdk";
import type { Query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { randomBytes } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { createTrelloClient } from "./trello.js";
import * as github from "./github.js";
import * as gitlab from "./gitlab.js";
import type {
  BoardData,
  Credentials,
  TrelloCard,
  AgentStatus,
  ParallelEvent,
  ParallelSessionSummary,
} from "./types.js";

const execAsync = promisify(execFile);

// ── Trello Prompts ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are operating on a codebase. You have been given a Trello board containing tasks.
Work through each card and checklist item in order.
For each checklist item you complete, call the check_trello_item tool with the checkItemId and cardId.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL checklist items on a card, call move_card_to_done with the cardId to move it to the Done list.
Once a card is in Done, do not interact with it again — move on to the next card.
Focus on one card at a time. Complete all its items, move it to Done, then proceed to the next.`;

const PARALLEL_AGENT_SYSTEM_PROMPT = `You are assigned ONE card from a Trello board. Focus exclusively on it.
Work through each checklist item in order. For each item you complete, call check_trello_item with the checkItemId and cardId.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL checklist items, call move_card_to_done with the cardId.
You are working in an isolated git worktree. Commit your changes when done.
Do NOT modify files outside the scope of your assigned card.`;

// ── GitHub Prompts ──────────────────────────────────────────────────────────

const GITHUB_SYSTEM_PROMPT = `You are operating on a codebase. You have been given GitHub issues containing tasks.
Work through each issue and its task list items in order.
For each task item you complete, call the check_github_task tool with the issueNumber and taskIndex.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL task items on an issue, call close_github_issue with the issueNumber.
When you have finished all issues, call create_pull_request to submit your changes.
Focus on one issue at a time. Complete all its tasks, close it, then proceed to the next.`;

const GITHUB_PARALLEL_SYSTEM_PROMPT = `You are assigned ONE GitHub issue. Focus exclusively on it.
Work through each task list item in order. For each item you complete, call check_github_task with the issueNumber and taskIndex.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL task items, call close_github_issue with the issueNumber.
You are working in an isolated git worktree. Commit your changes when done.
Do NOT modify files outside the scope of your assigned issue.`;

// ── GitLab Prompts ──────────────────────────────────────────────────────────

const GITLAB_SYSTEM_PROMPT = `You are operating on a codebase. You have been given GitLab issues containing tasks.
Work through each issue and its task list items in order.
For each task item you complete, call the check_gitlab_task tool with the issueIid and taskIndex.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL task items on an issue, call close_gitlab_issue with the issueIid.
When you have finished all issues, call create_merge_request to submit your changes.
Focus on one issue at a time. Complete all its tasks, close it, then proceed to the next.`;

const GITLAB_PARALLEL_SYSTEM_PROMPT = `You are assigned ONE GitLab issue. Focus exclusively on it.
Work through each task list item in order. For each item you complete, call check_gitlab_task with the issueIid and taskIndex.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL task items, call close_gitlab_issue with the issueIid.
You are working in an isolated git worktree. Commit your changes when done.
Do NOT modify files outside the scope of your assigned issue.`;

function buildUserPrompt(
  boardData: BoardData,
  userMessage?: string,
): string {
  let prompt = `Here is the Trello board with tasks to complete:\n\n${JSON.stringify(boardData, null, 2)}`;
  if (userMessage?.trim()) {
    prompt += `\n\nAdditional instructions from the user:\n${userMessage.trim()}`;
  }
  return prompt;
}

function buildParallelCardPrompt(
  card: TrelloCard,
  boardName: string,
  userMessage?: string,
): string {
  const cardData = {
    board: { name: boardName },
    card: {
      id: card.id,
      name: card.name,
      desc: card.desc,
      checklists: card.checklists,
    },
  };

  let prompt = `Here is your assigned card:\n\n${JSON.stringify(cardData, null, 2)}`;
  if (userMessage?.trim()) {
    prompt += `\n\nAdditional instructions from the user:\n${userMessage.trim()}`;
  }
  return prompt;
}

// ── GitHub/GitLab MCP server builders ───────────────────────────────────────

type SdkMcpServer = ReturnType<typeof createSdkMcpServer>;

function buildGitHubMcpServer(
  token: string,
  owner: string,
  repo: string,
): { server: SdkMcpServer; toolNames: string[] } {
  const checkGithubTask = tool(
    "check_github_task",
    "Mark a GitHub issue task list item as complete once the corresponding code task is done.",
    {
      issueNumber: z.number().describe("The GitHub issue number"),
      taskIndex: z.number().describe("Zero-based index of the task item in the issue body"),
    },
    async ({ issueNumber, taskIndex }) => {
      const issues = await github.getIssues(token, owner, repo);
      const issue = issues.find((i) => i.number === issueNumber);
      if (!issue?.body) {
        return {
          content: [{ type: "text" as const, text: `Issue #${issueNumber} not found or has no body` }],
        };
      }
      // getIssues returns the raw body on the issue object, but we typed it with tasks.
      // We need to fetch the raw body. The getIssues function returns the issue with body.
      const updatedBody = github.toggleTaskItem(issue.body, taskIndex, true);
      await github.updateIssueBody(token, owner, repo, issueNumber, updatedBody);
      return {
        content: [{ type: "text" as const, text: `Checked task ${taskIndex} on issue #${issueNumber}` }],
      };
    },
  );

  const closeGithubIssue = tool(
    "close_github_issue",
    "Close a GitHub issue after all its task items are completed.",
    {
      issueNumber: z.number().describe("The GitHub issue number to close"),
    },
    async ({ issueNumber }) => {
      await github.closeIssue(token, owner, repo, issueNumber);
      return {
        content: [{ type: "text" as const, text: `Closed issue #${issueNumber}` }],
      };
    },
  );

  const commentOnIssue = tool(
    "comment_on_issue",
    "Add a comment to a GitHub issue.",
    {
      issueNumber: z.number().describe("The GitHub issue number"),
      body: z.string().describe("The comment body text"),
    },
    async ({ issueNumber, body }) => {
      // Add comment by calling the GitHub API
      const res = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body }),
        },
      );
      if (!res.ok) {
        return {
          content: [{ type: "text" as const, text: `Failed to add comment: ${res.status}` }],
        };
      }
      return {
        content: [{ type: "text" as const, text: `Added comment on issue #${issueNumber}` }],
      };
    },
  );

  const server = createSdkMcpServer({
    name: "github-tools",
    tools: [checkGithubTask, closeGithubIssue, commentOnIssue],
  });

  return {
    server,
    toolNames: [
      "mcp__github-tools__check_github_task",
      "mcp__github-tools__close_github_issue",
      "mcp__github-tools__comment_on_issue",
    ],
  };
}

function buildGitLabMcpServer(
  token: string,
  projectId: number,
): { server: SdkMcpServer; toolNames: string[] } {
  const checkGitlabTask = tool(
    "check_gitlab_task",
    "Mark a GitLab issue task list item as complete once the corresponding code task is done.",
    {
      issueIid: z.number().describe("The GitLab issue IID (project-scoped number)"),
      taskIndex: z.number().describe("Zero-based index of the task item in the issue description"),
    },
    async ({ issueIid, taskIndex }) => {
      const issue = await gitlab.getIssue(token, projectId, issueIid);
      if (!issue?.description) {
        return {
          content: [{ type: "text" as const, text: `Issue !${issueIid} not found or has no description` }],
        };
      }
      const updatedDescription = gitlab.toggleTaskItem(issue.description, taskIndex, true);
      await gitlab.updateIssueDescription(token, projectId, issueIid, updatedDescription);
      return {
        content: [{ type: "text" as const, text: `Checked task ${taskIndex} on issue !${issueIid}` }],
      };
    },
  );

  const closeGitlabIssue = tool(
    "close_gitlab_issue",
    "Close a GitLab issue after all its task items are completed.",
    {
      issueIid: z.number().describe("The GitLab issue IID to close"),
    },
    async ({ issueIid }) => {
      await gitlab.closeIssue(token, projectId, issueIid);
      return {
        content: [{ type: "text" as const, text: `Closed issue !${issueIid}` }],
      };
    },
  );

  const commentOnGitlabIssue = tool(
    "comment_on_issue",
    "Add a note/comment to a GitLab issue.",
    {
      issueIid: z.number().describe("The GitLab issue IID"),
      body: z.string().describe("The note body text"),
    },
    async ({ issueIid, body }) => {
      await gitlab.addNote(token, projectId, issueIid, body);
      return {
        content: [{ type: "text" as const, text: `Added note on issue !${issueIid}` }],
      };
    },
  );

  const server = createSdkMcpServer({
    name: "gitlab-tools",
    tools: [checkGitlabTask, closeGitlabIssue, commentOnGitlabIssue],
  });

  return {
    server,
    toolNames: [
      "mcp__gitlab-tools__check_gitlab_task",
      "mcp__gitlab-tools__close_gitlab_issue",
      "mcp__gitlab-tools__comment_on_issue",
    ],
  };
}

// ── Storage MCP server (Google Drive / OneDrive) ─────────────────────────────

const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_SHEETS_API = "https://sheets.googleapis.com/v4";
const GOOGLE_DOCS_API = "https://docs.googleapis.com/v1";
const GRAPH_API = "https://graph.microsoft.com/v1.0";

const STORAGE_SYSTEM_PROMPT = `You are operating on files in a CLOUD STORAGE folder (Google Drive or OneDrive) via API.

CRITICAL: You MUST use the MCP storage tools to interact with files. Do NOT use local filesystem commands, bash, or any local file tools.
The cloud storage is accessed via API — the files are NOT on the local filesystem.

Available storage tools (use these, not local file operations):
- list_files: List all files in the workspace folder
- read_file: Read a file's content (use file name or ID from list_files)
- write_file: Create or overwrite a file
- edit_file: Find and replace text in a file
- search_files: Search for files
- read_spreadsheet: Read spreadsheet data (Google Sheets or Excel)
- update_cells: Update specific cells in a spreadsheet
- read_document: Read a Google Doc as Markdown
- update_document: Replace content of a Google Doc
- create_document: Create a new Google Doc

Available task tools:
- check_trello_item: Mark a Trello checklist item as complete
- move_card_to_done: Move a Trello card to the Done list

Work through each card and checklist item in order.
For each checklist item you complete, call check_trello_item.
Do not mark items complete unless the work has actually been done and verified.`;

function buildStorageMcpServer(
  provider: "google" | "onedrive",
  token: string,
  folderId: string,
): { server: SdkMcpServer; toolNames: string[] } {
  // OneDrive path-based folder helper
  function isOdPath(id: string): boolean {
    return id.startsWith("/") || id.includes("/");
  }
  function odFolderPrefix(id: string): string {
    if (id === "root") return "/me/drive/root";
    if (isOdPath(id)) return `/me/drive/root:/${id.replace(/^\//, "")}:`;
    return `/me/drive/items/${id}`;
  }

  // File ID cache for name → id resolution
  const fileIds = new Map<string, string>();

  function cleanName(path: string): string {
    return path.replace(/\s*\[id:\s*[^\]]+\]/, "").replace(/\s*\([^)]+\)\s*$/, "").trim();
  }

  function extractId(path: string): string | null {
    const m = path.match(/\[id:\s*([^\]]+)\]/);
    return m ? m[1].trim() : null;
  }

  async function resolveFileId(path: string): Promise<string> {
    const explicit = extractId(path);
    if (explicit) return explicit;
    const cleaned = cleanName(path);
    if (fileIds.has(cleaned)) return fileIds.get(cleaned)!;
    if (/^[a-zA-Z0-9_-]{20,}$/.test(cleaned)) return cleaned;

    if (provider === "google") {
      const q = `'${folderId}' in parents and trashed = false`;
      const res = await fetch(
        `${GOOGLE_DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=200`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = (await res.json()) as { files: Array<{ id: string; name: string }> };
      for (const f of data.files) fileIds.set(f.name, f.id);
      if (fileIds.has(cleaned)) return fileIds.get(cleaned)!;
    } else {
      const path2 = `${odFolderPrefix(folderId)}/children`;
      const res = await fetch(`${GRAPH_API}${path2}?$top=200`, { headers: { Authorization: `Bearer ${token}` } });
      const data = (await res.json()) as { value: Array<{ id: string; name: string }> };
      for (const f of data.value) fileIds.set(f.name, f.id);
      if (fileIds.has(cleaned)) return fileIds.get(cleaned)!;
    }
    throw new Error(`File not found: ${cleaned}`);
  }

  const listFilesTool = tool(
    "list_files",
    "List all files in the workspace folder.",
    {},
    async () => {
      if (provider === "google") {
        const q = `'${folderId}' in parents and trashed = false`;
        const res = await fetch(
          `${GOOGLE_DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)&pageSize=200`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = (await res.json()) as { files: Array<{ id: string; name: string; mimeType: string }> };
        for (const f of data.files) fileIds.set(f.name, f.id);
        const text = data.files.map((f) => `${f.name}  [id: ${f.id}]  (${f.mimeType})`).join("\n") || "No files found";
        return { content: [{ type: "text" as const, text }] };
      }
      const path = `${odFolderPrefix(folderId)}/children`;
      const res = await fetch(`${GRAPH_API}${path}?$top=200`, { headers: { Authorization: `Bearer ${token}` } });
      const data = (await res.json()) as { value: Array<{ id: string; name: string; file?: { mimeType: string } }> };
      for (const f of data.value) fileIds.set(f.name, f.id);
      const text = data.value.map((f) => `${f.name}  [id: ${f.id}]  (${f.file?.mimeType ?? "folder"})`).join("\n") || "No files found";
      return { content: [{ type: "text" as const, text }] };
    },
  );

  const readFileTool = tool(
    "read_file",
    "Read the contents of a file. Use the file name or ID from list_files.",
    { path: z.string().describe("File name or file ID") },
    async ({ path: filePath }) => {
      const fileId = await resolveFileId(filePath);
      if (provider === "google") {
        const meta = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}?fields=name,mimeType`, { headers: { Authorization: `Bearer ${token}` } });
        const { mimeType } = (await meta.json()) as { mimeType: string };
        let content: string;
        if (mimeType === "application/vnd.google-apps.document") {
          const r = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}/export?mimeType=text/markdown`, { headers: { Authorization: `Bearer ${token}` } });
          content = await r.text();
        } else if (mimeType === "application/vnd.google-apps.spreadsheet") {
          const r = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}/export?mimeType=text/csv`, { headers: { Authorization: `Bearer ${token}` } });
          content = await r.text();
        } else {
          const r = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
          content = await r.text();
        }
        const numbered = content.split("\n").map((l, i) => `${String(i + 1).padStart(5)} ${l}`).join("\n");
        return { content: [{ type: "text" as const, text: numbered }] };
      }
      const res = await fetch(`${GRAPH_API}/me/drive/items/${fileId}/content`, { headers: { Authorization: `Bearer ${token}` } });
      const content = await res.text();
      const numbered = content.split("\n").map((l, i) => `${String(i + 1).padStart(5)} ${l}`).join("\n");
      return { content: [{ type: "text" as const, text: numbered }] };
    },
  );

  const writeFileTool = tool(
    "write_file",
    "Create or overwrite a file in the workspace folder.",
    {
      path: z.string().describe("File name"),
      content: z.string().describe("The full file content"),
    },
    async ({ path: filePath, content }) => {
      const cleaned = cleanName(filePath);
      if (provider === "google") {
        // Check if exists
        let existingId: string | undefined;
        try { existingId = await resolveFileId(cleaned); } catch { /* new file */ }
        if (existingId) {
          await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`, {
            method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/plain" }, body: content,
          });
          return { content: [{ type: "text" as const, text: `File updated: ${cleaned}` }] };
        }
        const boundary = "taskpilot";
        const metadata = JSON.stringify({ name: cleaned, parents: [folderId] });
        const body = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: text/plain\r\n\r\n${content}\r\n--${boundary}--`;
        const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`, {
          method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body,
        });
        const { id } = (await res.json()) as { id: string };
        fileIds.set(cleaned, id);
        return { content: [{ type: "text" as const, text: `File created: ${cleaned}` }] };
      }
      // OneDrive
      let uploadPath: string;
      if (folderId === "root") {
        uploadPath = `/me/drive/root:/${encodeURIComponent(cleaned)}:/content`;
      } else if (isOdPath(folderId)) {
        uploadPath = `/me/drive/root:/${folderId.replace(/^\//, "")}/${encodeURIComponent(cleaned)}:/content`;
      } else {
        uploadPath = `/me/drive/items/${folderId}:/${encodeURIComponent(cleaned)}:/content`;
      }
      const res = await fetch(`${GRAPH_API}${uploadPath}`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/plain" }, body: content,
      });
      const { id } = (await res.json()) as { id: string };
      fileIds.set(cleaned, id);
      return { content: [{ type: "text" as const, text: `File written: ${cleaned}` }] };
    },
  );

  const editFileTool = tool(
    "edit_file",
    "Replace exact text in a file. The old_text must match exactly.",
    {
      path: z.string().describe("File name or ID"),
      old_text: z.string().describe("Exact text to find"),
      new_text: z.string().describe("Replacement text"),
    },
    async ({ path: filePath, old_text, new_text }) => {
      const fileId = await resolveFileId(filePath);
      // Read current content
      let currentContent: string;
      if (provider === "google") {
        const meta = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}?fields=mimeType`, { headers: { Authorization: `Bearer ${token}` } });
        const { mimeType } = (await meta.json()) as { mimeType: string };
        if (mimeType === "application/vnd.google-apps.document") {
          const r = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}/export?mimeType=text/plain`, { headers: { Authorization: `Bearer ${token}` } });
          currentContent = await r.text();
        } else {
          const r = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
          currentContent = await r.text();
        }
      } else {
        const r = await fetch(`${GRAPH_API}/me/drive/items/${fileId}/content`, { headers: { Authorization: `Bearer ${token}` } });
        currentContent = await r.text();
      }
      if (!currentContent.includes(old_text)) {
        return { content: [{ type: "text" as const, text: `old_text not found in file. Make sure it matches exactly.` }] };
      }
      const updated = currentContent.replace(old_text, new_text);
      if (provider === "google") {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/plain" }, body: updated,
        });
      } else {
        await fetch(`${GRAPH_API}/me/drive/items/${fileId}/content`, {
          method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/plain" }, body: updated,
        });
      }
      return { content: [{ type: "text" as const, text: `File edited successfully` }] };
    },
  );

  const readSpreadsheetTool = tool(
    "read_spreadsheet",
    "Read spreadsheet data (Google Sheets or Excel).",
    { path: z.string().describe("Spreadsheet file name or ID") },
    async ({ path: filePath }) => {
      const fileId = await resolveFileId(filePath);
      if (provider === "google") {
        const res = await fetch(`${GOOGLE_SHEETS_API}/spreadsheets/${fileId}?fields=properties.title,sheets.properties`, { headers: { Authorization: `Bearer ${token}` } });
        const data = (await res.json()) as { properties: { title: string }; sheets: Array<{ properties: { title: string } }> };
        const sheets = await Promise.all(data.sheets.map(async (s) => {
          const vr = await fetch(`${GOOGLE_SHEETS_API}/spreadsheets/${fileId}/values/${encodeURIComponent(s.properties.title)}`, { headers: { Authorization: `Bearer ${token}` } });
          const vd = (await vr.json()) as { values?: string[][] };
          return `## ${s.properties.title}\n${(vd.values ?? []).map((r) => r.join("\t")).join("\n")}`;
        }));
        return { content: [{ type: "text" as const, text: sheets.join("\n\n") || "Empty spreadsheet" }] };
      }
      // OneDrive Excel
      const ws = await fetch(`${GRAPH_API}/me/drive/items/${fileId}/workbook/worksheets`, { headers: { Authorization: `Bearer ${token}` } });
      const wsData = (await ws.json()) as { value: Array<{ name: string }> };
      const sheets = await Promise.all(wsData.value.map(async (s) => {
        try {
          const r = await fetch(`${GRAPH_API}/me/drive/items/${fileId}/workbook/worksheets('${encodeURIComponent(s.name)}')/usedRange`, { headers: { Authorization: `Bearer ${token}` } });
          const rd = (await r.json()) as { values: string[][] };
          return `## ${s.name}\n${(rd.values ?? []).map((row) => row.join("\t")).join("\n")}`;
        } catch { return `## ${s.name}\n(empty)`; }
      }));
      return { content: [{ type: "text" as const, text: sheets.join("\n\n") || "Empty workbook" }] };
    },
  );

  const updateCellsTool = tool(
    "update_cells",
    "Update specific cells in a spreadsheet.",
    {
      path: z.string().describe("Spreadsheet file name or ID"),
      worksheet: z.string().describe("Worksheet name"),
      range: z.string().describe("Cell range (e.g. A1:C3)"),
      values: z.array(z.array(z.string())).describe("2D array of values"),
    },
    async ({ path: filePath, worksheet, range, values }) => {
      const fileId = await resolveFileId(filePath);
      if (provider === "google") {
        const fullRange = `${worksheet}!${range}`;
        await fetch(`${GOOGLE_SHEETS_API}/spreadsheets/${fileId}/values/${encodeURIComponent(fullRange)}?valueInputOption=USER_ENTERED`, {
          method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ values }),
        });
      } else {
        await fetch(`${GRAPH_API}/me/drive/items/${fileId}/workbook/worksheets('${encodeURIComponent(worksheet)}')/range(address='${range}')`, {
          method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ values }),
        });
      }
      return { content: [{ type: "text" as const, text: `Updated ${worksheet}!${range}` }] };
    },
  );

  const readDocumentTool = tool(
    "read_document",
    "Read a Google Doc as Markdown text.",
    { path: z.string().describe("Document name or ID") },
    async ({ path: filePath }) => {
      if (provider !== "google") {
        return { content: [{ type: "text" as const, text: "read_document is only available with Google Drive. Use read_file for OneDrive documents." }] };
      }
      const fileId = await resolveFileId(filePath);
      const res = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}/export?mimeType=text/markdown`, { headers: { Authorization: `Bearer ${token}` } });
      const content = await res.text();
      return { content: [{ type: "text" as const, text: content }] };
    },
  );

  const updateDocumentTool = tool(
    "update_document",
    "Replace the content of a Google Doc.",
    {
      path: z.string().describe("Document name or ID"),
      content: z.string().describe("New document content"),
    },
    async ({ path: filePath, content }) => {
      if (provider !== "google") {
        return { content: [{ type: "text" as const, text: "update_document is only available with Google Drive." }] };
      }
      const fileId = await resolveFileId(filePath);
      const doc = await fetch(`${GOOGLE_DOCS_API}/documents/${fileId}`, { headers: { Authorization: `Bearer ${token}` } });
      const docData = (await doc.json()) as { body: { content: Array<{ endIndex: number }> } };
      const endIndex = docData.body.content[docData.body.content.length - 1]?.endIndex ?? 1;
      const requests: Array<Record<string, unknown>> = [];
      if (endIndex > 2) {
        requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } } });
      }
      requests.push({ insertText: { location: { index: 1 }, text: content } });
      await fetch(`${GOOGLE_DOCS_API}/documents/${fileId}:batchUpdate`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ requests }),
      });
      return { content: [{ type: "text" as const, text: `Document updated` }] };
    },
  );

  const allTools = [listFilesTool, readFileTool, writeFileTool, editFileTool, readSpreadsheetTool, updateCellsTool, readDocumentTool, updateDocumentTool];

  const server = createSdkMcpServer({
    name: "storage-tools",
    tools: allTools,
  });

  return {
    server,
    toolNames: allTools.map((t) => `mcp__storage-tools__${t.name}`),
  };
}

export interface RunnerOptions {
  credentials: Credentials;
  boardData: BoardData;
  cwd: string;
  userMessage?: string;
  abortController?: AbortController;
  source?: "trello" | "github" | "gitlab";
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabToken?: string;
  gitlabProjectId?: number;
  workspaceProvider?: "google" | "onedrive";
  workspaceFolderId?: string;
  workspaceToken?: string;
}

export type { Query };

export function launchSession(options: RunnerOptions): Query {
  const { credentials, boardData, cwd, userMessage, abortController, source = "trello" } = options;

  // ── GitHub source ─────────────────────────────────────────────────────
  if (source === "github") {
    const ghToken = options.githubToken ?? credentials.githubToken ?? "";
    const ghOwner = options.githubOwner ?? "";
    const ghRepo = options.githubRepo ?? "";
    const { server, toolNames } = buildGitHubMcpServer(ghToken, ghOwner, ghRepo);

    return query({
      prompt: buildUserPrompt(boardData, userMessage),
      options: {
        abortController,
        cwd,
        env: {
          ANTHROPIC_API_KEY: credentials.anthropicApiKey,
          CLAUDE_AGENT_SDK_CLIENT_APP: "taskpilot-cli/0.1.0",
        },
        systemPrompt: GITHUB_SYSTEM_PROMPT,
        permissionMode: "acceptEdits",
        allowedTools: toolNames,
        maxTurns: 50,
        mcpServers: { "github-tools": server },
        persistSession: false,
      },
    });
  }

  // ── GitLab source ─────────────────────────────────────────────────────
  if (source === "gitlab") {
    const glToken = options.gitlabToken ?? credentials.gitlabToken ?? "";
    const glProjectId = options.gitlabProjectId ?? 0;
    const { server, toolNames } = buildGitLabMcpServer(glToken, glProjectId);

    return query({
      prompt: buildUserPrompt(boardData, userMessage),
      options: {
        abortController,
        cwd,
        env: {
          ANTHROPIC_API_KEY: credentials.anthropicApiKey,
          CLAUDE_AGENT_SDK_CLIENT_APP: "taskpilot-cli/0.1.0",
        },
        systemPrompt: GITLAB_SYSTEM_PROMPT,
        permissionMode: "acceptEdits",
        allowedTools: toolNames,
        maxTurns: 50,
        mcpServers: { "gitlab-tools": server },
        persistSession: false,
      },
    });
  }

  // ── Trello source (default) ───────────────────────────────────────────
  const trello = createTrelloClient(
    credentials.trelloApiKey,
    credentials.trelloToken,
  );

  const activeBoardData: BoardData = {
    ...boardData,
    cards: boardData.doneListId
      ? boardData.cards.filter((c) => c.idList !== boardData.doneListId)
      : boardData.cards,
  };

  const checkTrelloItem = tool(
    "check_trello_item",
    "Mark a Trello checklist item as complete once the corresponding code task is done.",
    {
      checkItemId: z.string().describe("The Trello checklist item ID"),
      cardId: z.string().describe("The Trello card ID"),
    },
    async ({ checkItemId, cardId }) => {
      await trello.updateCheckItem(cardId, checkItemId, "complete");
      return {
        content: [
          {
            type: "text" as const,
            text: `Marked checklist item ${checkItemId} as complete on card ${cardId}`,
          },
        ],
      };
    },
  );

  const moveCardToDone = tool(
    "move_card_to_done",
    "Move a Trello card to the Done list after all its checklist items are completed.",
    {
      cardId: z.string().describe("The Trello card ID to move to Done"),
    },
    async ({ cardId }) => {
      const doneListId = await trello.findOrCreateDoneList(boardData.board.id);
      await trello.moveCard(cardId, doneListId);
      return {
        content: [
          {
            type: "text" as const,
            text: `Moved card ${cardId} to Done list`,
          },
        ],
      };
    },
  );

  const trelloServer = createSdkMcpServer({
    name: "trello-tools",
    tools: [checkTrelloItem, moveCardToDone],
  });

  // ── Trello + cloud storage workspace ─────────────────────────────────
  if (options.workspaceProvider && options.workspaceFolderId && options.workspaceToken) {
    const { server: storageServer, toolNames: storageToolNames } = buildStorageMcpServer(
      options.workspaceProvider, options.workspaceToken, options.workspaceFolderId,
    );
    return query({
      prompt: buildUserPrompt(activeBoardData, userMessage),
      options: {
        abortController,
        cwd,
        env: {
          ANTHROPIC_API_KEY: credentials.anthropicApiKey,
          CLAUDE_AGENT_SDK_CLIENT_APP: "taskpilot-cli/0.1.0",
        },
        systemPrompt: STORAGE_SYSTEM_PROMPT,
        permissionMode: "bypassPermissions",
        tools: [], // Disable ALL built-in tools — only MCP tools available
        disallowedTools: [
          "Bash", "Read", "Write", "Edit", "Glob", "Grep",
          "ToolSearch", "WebSearch", "WebFetch",
          "Agent", "NotebookEdit",
          "TodoRead", "TodoWrite",
        ],
        allowedTools: [
          "mcp__trello-tools__check_trello_item",
          "mcp__trello-tools__move_card_to_done",
          ...storageToolNames,
        ],
        maxTurns: 50,
        mcpServers: {
          "trello-tools": trelloServer,
          "storage-tools": storageServer,
        },
        persistSession: false,
      },
    });
  }

  return query({
    prompt: buildUserPrompt(activeBoardData, userMessage),
    options: {
      abortController,
      cwd,
      env: {
        ANTHROPIC_API_KEY: credentials.anthropicApiKey,
        CLAUDE_AGENT_SDK_CLIENT_APP: "taskpilot-cli/0.1.0",
      },
      systemPrompt: SYSTEM_PROMPT,
      permissionMode: "acceptEdits",
      allowedTools: [
        "mcp__trello-tools__check_trello_item",
        "mcp__trello-tools__move_card_to_done",
      ],
      maxTurns: 50,
      mcpServers: {
        "trello-tools": trelloServer,
      },
      persistSession: false,
    },
  });
}

// ── Parallel Session ──────────────────────────────────────────────────────

export interface ParallelRunnerOptions {
  credentials: Credentials;
  boardData: BoardData;
  cwd: string;
  maxConcurrency: number;
  userMessage?: string;
  abortController?: AbortController;
  source?: "trello" | "github" | "gitlab";
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabToken?: string;
  gitlabProjectId?: number;
}

async function git(
  cwd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return execAsync("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
}

async function createWorktree(cwd: string, branchName: string): Promise<string> {
  const worktreePath = join(cwd, ".taskpilot-worktrees", branchName);
  await git(cwd, ["worktree", "add", "-b", branchName, worktreePath, "HEAD"]);

  try {
    const { stdout } = await execAsync("ls", ["-d", join(cwd, "node_modules")]);
    if (stdout.trim()) {
      await execAsync("ln", [
        "-sf",
        join(cwd, "node_modules"),
        join(worktreePath, "node_modules"),
      ]);
    }
  } catch {
    // node_modules doesn't exist, skip
  }

  return worktreePath;
}

async function removeWorktree(cwd: string, worktreePath: string): Promise<void> {
  await git(cwd, ["worktree", "remove", "--force", worktreePath]);
}

export async function* runParallelSession(
  options: ParallelRunnerOptions,
): AsyncGenerator<ParallelEvent> {
  const {
    credentials,
    boardData,
    cwd,
    maxConcurrency,
    userMessage,
    abortController,
    source = "trello",
  } = options;

  const sessionId = randomBytes(4).toString("hex");
  const effectiveConcurrency = Math.min(maxConcurrency, 5);

  const trello = source === "trello"
    ? createTrelloClient(credentials.trelloApiKey, credentials.trelloToken)
    : null;

  const activeCards = boardData.doneListId
    ? boardData.cards.filter((c) => c.idList !== boardData.doneListId)
    : boardData.cards;

  if (activeCards.length === 0) return;

  const baseBranch = (await git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"])).stdout.trim();
  const baseSha = (await git(cwd, ["rev-parse", "HEAD"])).stdout.trim();

  const agentStatuses = new Map<string, AgentStatus>();
  const worktrees = new Map<string, string>();
  const branches = new Map<string, string>();

  // Queue all cards
  for (const card of activeCards) {
    agentStatuses.set(card.id, {
      cardId: card.id,
      cardName: card.name,
      state: "queued",
      checklistTotal: card.checklists.reduce(
        (sum, cl) => sum + cl.checkItems.length,
        0,
      ),
      checklistDone: card.checklists.reduce(
        (sum, cl) =>
          sum + cl.checkItems.filter((i) => i.state === "complete").length,
        0,
      ),
    });
    yield { type: "agent_queued", cardId: card.id, cardName: card.name };
  }

  const queue = [...activeCards];

  async function runAgent(card: TrelloCard): Promise<ParallelEvent[]> {
    const events: ParallelEvent[] = [];
    const branchName = `parallel/${sessionId}/${card.id.slice(-6)}`;
    branches.set(card.id, branchName);
    const startTime = Date.now();

    try {
      const worktreePath = await createWorktree(cwd, branchName);
      worktrees.set(card.id, worktreePath);

      const status = agentStatuses.get(card.id)!;
      status.state = "running";
      status.branch = branchName;
      status.worktreePath = worktreePath;

      events.push({
        type: "agent_started",
        cardId: card.id,
        branch: branchName,
        worktreePath,
      });

      // Build tools scoped to this card, based on source
      let mcpServerName: string;
      let mcpServer: SdkMcpServer;
      let allowedTools: string[];
      let systemPrompt: string;

      if (source === "github") {
        const ghToken = options.githubToken ?? credentials.githubToken ?? "";
        const ghOwner = options.githubOwner ?? "";
        const ghRepo = options.githubRepo ?? "";
        const gh = buildGitHubMcpServer(ghToken, ghOwner, ghRepo);
        mcpServerName = "github-tools";
        mcpServer = gh.server;
        allowedTools = gh.toolNames;
        systemPrompt = GITHUB_PARALLEL_SYSTEM_PROMPT;
      } else if (source === "gitlab") {
        const glToken = options.gitlabToken ?? credentials.gitlabToken ?? "";
        const glProjectId = options.gitlabProjectId ?? 0;
        const gl = buildGitLabMcpServer(glToken, glProjectId);
        mcpServerName = "gitlab-tools";
        mcpServer = gl.server;
        allowedTools = gl.toolNames;
        systemPrompt = GITLAB_PARALLEL_SYSTEM_PROMPT;
      } else {
        const checkTrelloItem = tool(
          "check_trello_item",
          "Mark a Trello checklist item as complete.",
          {
            checkItemId: z.string().describe("The Trello checklist item ID"),
            cardId: z.string().describe("The Trello card ID"),
          },
          async ({ checkItemId, cardId }) => {
            await trello!.updateCheckItem(cardId, checkItemId, "complete");
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Marked checklist item ${checkItemId} as complete on card ${cardId}`,
                },
              ],
            };
          },
        );

        const moveCardToDone = tool(
          "move_card_to_done",
          "Move a Trello card to the Done list after all checklist items are completed.",
          {
            cardId: z.string().describe("The Trello card ID to move to Done"),
          },
          async ({ cardId }) => {
            const doneListId = await trello!.findOrCreateDoneList(boardData.board.id);
            await trello!.moveCard(cardId, doneListId);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Moved card ${cardId} to Done list`,
                },
              ],
            };
          },
        );

        mcpServerName = "trello-tools";
        mcpServer = createSdkMcpServer({
          name: "trello-tools",
          tools: [checkTrelloItem, moveCardToDone],
        });
        allowedTools = [
          "mcp__trello-tools__check_trello_item",
          "mcp__trello-tools__move_card_to_done",
        ];
        systemPrompt = PARALLEL_AGENT_SYSTEM_PROMPT;
      }

      const agentQuery = query({
        prompt: buildParallelCardPrompt(card, boardData.board.name, userMessage),
        options: {
          abortController,
          cwd: worktreePath,
          env: {
            ANTHROPIC_API_KEY: credentials.anthropicApiKey,
            CLAUDE_AGENT_SDK_CLIENT_APP: "taskpilot-cli/0.1.0",
          },
          systemPrompt,
          permissionMode: "acceptEdits",
          allowedTools,
          maxTurns: 30,
          mcpServers: { [mcpServerName]: mcpServer },
          persistSession: false,
        },
      });

      for await (const message of agentQuery) {
        events.push({ type: "agent_message", cardId: card.id, message });
      }

      status.state = "completed";
      status.durationMs = Date.now() - startTime;
      events.push({ type: "agent_completed", cardId: card.id, status: { ...status } });
    } catch (err) {
      const status = agentStatuses.get(card.id)!;
      status.state = "failed";
      status.error = err instanceof Error ? err.message : "Unknown error";
      status.durationMs = Date.now() - startTime;
      events.push({ type: "agent_failed", cardId: card.id, error: status.error });
    }

    return events;
  }

  // Run agents with concurrency control
  const results: ParallelEvent[][] = [];
  let queueIndex = 0;

  async function worker(): Promise<void> {
    while (queueIndex < queue.length) {
      if (abortController?.signal.aborted) return;
      const card = queue[queueIndex++];
      if (!card) return;
      const events = await runAgent(card);
      results.push(events);
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(effectiveConcurrency, queue.length); i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  for (const eventBatch of results) {
    for (const event of eventBatch) {
      yield event;
    }
  }

  // ── Merge phase ─────────────────────────────────────────────────────────
  const integrationBranch = `parallel/integration/${sessionId}`;
  await git(cwd, ["checkout", "-b", integrationBranch]);

  const mergeConflicts: Array<{ cardId: string; files: string[] }> = [];

  for (const card of activeCards) {
    const branch = branches.get(card.id);
    const worktreePath = worktrees.get(card.id);
    const status = agentStatuses.get(card.id)!;

    if (!branch || status.state === "failed") continue;

    yield { type: "merge_started", cardId: card.id };
    status.state = "merging";

    try {
      await git(cwd, [
        "merge",
        "--no-ff",
        "-m",
        `Merge parallel agent: ${branch}`,
        branch,
      ]);
      yield { type: "merge_completed", cardId: card.id, success: true };
    } catch {
      const { stdout } = await git(cwd, [
        "diff",
        "--name-only",
        "--diff-filter=U",
      ]);
      const conflicts = stdout
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      if (conflicts.length > 0) {
        await git(cwd, ["merge", "--abort"]);
        status.state = "conflict";
        mergeConflicts.push({ cardId: card.id, files: conflicts });
        yield {
          type: "merge_completed",
          cardId: card.id,
          success: false,
          conflicts,
        };
      }
    }

    // Cleanup
    if (worktreePath) {
      try {
        await removeWorktree(cwd, worktreePath);
      } catch {
        // Best effort
      }
    }
    try {
      await git(cwd, ["branch", "-D", branch]);
    } catch {
      // Best effort
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  let diffStats = { filesChanged: 0, insertions: 0, deletions: 0 };
  try {
    const { stdout } = await git(cwd, [
      "diff",
      "--numstat",
      `${baseSha}...HEAD`,
    ]);
    for (const line of stdout.trim().split("\n")) {
      const match = line.match(/^(\d+)\t(\d+)\t/);
      if (match) {
        diffStats.filesChanged++;
        diffStats.insertions += parseInt(match[1], 10);
        diffStats.deletions += parseInt(match[2], 10);
      }
    }
  } catch {
    // Stats unavailable
  }

  const summary: ParallelSessionSummary = {
    agents: Array.from(agentStatuses.values()),
    totalCostUsd: Array.from(agentStatuses.values()).reduce(
      (sum, a) => sum + (a.costUsd ?? 0),
      0,
    ),
    totalDurationMs: Array.from(agentStatuses.values()).reduce(
      (max, a) => Math.max(max, a.durationMs ?? 0),
      0,
    ),
    integrationBranch,
    mergeConflicts,
    diffStats,
  };

  yield { type: "summary", summary };

  // Return to original branch
  try {
    await git(cwd, ["checkout", baseBranch]);
  } catch {
    // Best effort
  }
}
