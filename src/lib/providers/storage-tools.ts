/**
 * Storage workspace tool set — file operations via Google Drive or OneDrive APIs.
 * Enables AI agents to work on files in cloud storage folders.
 */

import type { ToolDefinition } from "./tools.js";
import type { ToolSet } from "./source-tools.js";
import * as googleClient from "#/lib/google/client";
import * as onedriveClient from "#/lib/onedrive/client";

export interface StorageToolContext {
  provider: "google" | "onedrive";
  token: string;
  folderId: string;
  folderName: string;
}

const STORAGE_TOOLS: ToolDefinition[] = [
  {
    name: "read_file",
    description:
      "Read the contents of a file from the workspace folder. Returns text content with line numbers. Use the file name or file ID from list_files.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File name or file ID (from list_files output)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Create or overwrite a file in the workspace folder.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File name to create or overwrite",
        },
        content: { type: "string", description: "The full file content" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description:
      "Replace an exact string in a file with new text. The old_text must match exactly.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File name in the workspace",
        },
        old_text: {
          type: "string",
          description: "The exact text to find and replace",
        },
        new_text: {
          type: "string",
          description: "The replacement text",
        },
      },
      required: ["path", "old_text", "new_text"],
    },
  },
  {
    name: "list_files",
    description:
      "List all files in the workspace folder.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "search_files",
    description:
      "Search for files by name or content in the workspace folder.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to find files",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "read_spreadsheet",
    description:
      "Read the contents of a spreadsheet (Google Sheets or Excel). Returns all worksheets with their tabular data.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Spreadsheet file name or ID",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "update_cells",
    description:
      "Update specific cells in a spreadsheet. Specify the worksheet name and cell range (e.g. 'A1:C3').",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Spreadsheet file name or ID",
        },
        worksheet: {
          type: "string",
          description: "Worksheet/sheet name",
        },
        range: {
          type: "string",
          description: "Cell range in A1 notation (e.g. 'A1:C3')",
        },
        values: {
          type: "array",
          description: "2D array of values (rows of columns)",
          items: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      required: ["path", "worksheet", "range", "values"],
    },
  },
  {
    name: "append_rows",
    description:
      "Add rows to the end of a spreadsheet worksheet.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Spreadsheet file name or ID",
        },
        worksheet: {
          type: "string",
          description: "Worksheet/sheet name",
        },
        values: {
          type: "array",
          description: "2D array of row values to append",
          items: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      required: ["path", "worksheet", "values"],
    },
  },
  {
    name: "read_document",
    description:
      "Read the contents of a Google Doc. Returns the document as Markdown text.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Document file name or ID",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "update_document",
    description:
      "Replace the entire content of a Google Doc with new text.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Document file name or ID",
        },
        content: {
          type: "string",
          description: "The new document content (plain text)",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "create_document",
    description:
      "Create a new Google Doc in the workspace folder.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Document title",
        },
        content: {
          type: "string",
          description: "Initial document content (plain text)",
        },
      },
      required: ["title"],
    },
  },
];

function addLineNumbers(content: string): string {
  return content
    .split("\n")
    .map((line, i) => `${String(i + 1).padStart(5)} ${line}`)
    .join("\n");
}

// ── File ID resolution ───────────────────────────────────────────────────

/** Cache of file name → file ID mappings for the current session */
const fileIdCache = new Map<string, string>();

/** Extract a file ID if the agent passed something like "Untitled document [id: abc123]" */
function extractFileId(path: string): string | null {
  const match = path.match(/\[id:\s*([^\]]+)\]/);
  return match ? match[1].trim() : null;
}

/** Strip metadata suffixes the AI might include from list_files output */
function cleanFileName(path: string): string {
  return path
    .replace(/\s*\[id:\s*[^\]]+\]/, "")    // remove [id: ...]
    .replace(/\s*\([^)]+\)\s*$/, "")        // remove trailing (mimeType)
    .trim();
}

async function resolveGoogleFileId(
  token: string,
  folderId: string,
  path: string,
): Promise<string> {
  // Check if the agent passed an explicit ID
  const explicitId = extractFileId(path);
  if (explicitId) return explicitId;

  const cleaned = cleanFileName(path);

  const cached = fileIdCache.get(cleaned);
  if (cached) return cached;

  // Also check uncleaned path in cache
  const cachedRaw = fileIdCache.get(path);
  if (cachedRaw) return cachedRaw;

  // If it looks like a Drive file ID already (long alphanumeric), use it directly
  if (/^[a-zA-Z0-9_-]{20,}$/.test(cleaned)) return cleaned;

  // Search by name in the folder
  const files = await googleClient.listFiles(token, folderId);
  const match = files.find(
    (f) => f.name.toLowerCase() === cleaned.toLowerCase(),
  );
  if (!match) throw new Error(`File not found: ${cleaned}`);
  fileIdCache.set(cleaned, match.id);
  return match.id;
}

async function resolveOneDriveItemId(
  token: string,
  folderId: string,
  path: string,
): Promise<string> {
  const explicitId = extractFileId(path);
  if (explicitId) return explicitId;

  const cleaned = cleanFileName(path);

  const cached = fileIdCache.get(cleaned);
  if (cached) return cached;

  const cachedRaw = fileIdCache.get(path);
  if (cachedRaw) return cachedRaw;

  const files = await onedriveClient.listFiles(token, folderId);
  const match = files.find(
    (f) => f.name.toLowerCase() === cleaned.toLowerCase(),
  );
  if (!match) throw new Error(`File not found: ${cleaned}`);
  fileIdCache.set(cleaned, match.id);
  return match.id;
}

// ── Google Drive execution ───────────────────────────────────────────────

async function executeGoogleTool(
  name: string,
  input: Record<string, unknown>,
  ctx: StorageToolContext,
): Promise<string> {
  const { token, folderId } = ctx;

  switch (name) {
    case "read_file": {
      try {
        const fileId = await resolveGoogleFileId(token, folderId, input.path as string);
        const { content } = await googleClient.getFile(token, fileId);
        return addLineNumbers(content);
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to read file"}`;
      }
    }
    case "write_file": {
      try {
        const files = await googleClient.listFiles(token, folderId);
        const existing = files.find(
          (f) => f.name.toLowerCase() === (input.path as string).toLowerCase(),
        );
        if (existing) {
          await googleClient.updateFile(token, existing.id, input.content as string);
          return `File updated: ${input.path}`;
        }
        const result = await googleClient.createFile(
          token, folderId, input.path as string, input.content as string,
        );
        fileIdCache.set(input.path as string, result.id);
        return `File created: ${input.path}`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to write file"}`;
      }
    }
    case "edit_file": {
      try {
        const fileId = await resolveGoogleFileId(token, folderId, input.path as string);
        const { content } = await googleClient.getFile(token, fileId);
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
        await googleClient.updateFile(token, fileId, updated);
        return `File edited: ${input.path}`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to edit file"}`;
      }
    }
    case "list_files": {
      try {
        const files = await googleClient.listFiles(token, folderId);
        if (files.length === 0) return "No files found";
        // Cache IDs for resolution and show ID so agent can reference duplicates
        for (const f of files) fileIdCache.set(f.name, f.id);
        return files.map((f) => `${f.name}  [id: ${f.id}]  (${f.mimeType})`).join("\n");
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to list files"}`;
      }
    }
    case "search_files": {
      try {
        const files = await googleClient.searchFiles(
          token, folderId, input.query as string,
        );
        if (files.length === 0) return "No matches found";
        for (const f of files) fileIdCache.set(f.name, f.id);
        return files.map((f) => `${f.name}  [id: ${f.id}]  (${f.mimeType})`).join("\n");
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Search failed"}`;
      }
    }
    case "read_spreadsheet": {
      try {
        const fileId = await resolveGoogleFileId(token, folderId, input.path as string);
        const data = await googleClient.getSpreadsheet(token, fileId);
        const output = data.sheets.map((sheet) => {
          const header = `## ${sheet.title} (${sheet.rowCount} rows × ${sheet.columnCount} cols)\n`;
          const table = sheet.values.map((row) => row.join("\t")).join("\n");
          return header + table;
        }).join("\n\n");
        return output || "Empty spreadsheet";
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to read spreadsheet"}`;
      }
    }
    case "update_cells": {
      try {
        const fileId = await resolveGoogleFileId(token, folderId, input.path as string);
        const range = `${input.worksheet as string}!${input.range as string}`;
        await googleClient.updateCells(
          token, fileId, range, input.values as string[][],
        );
        return `Cells updated: ${input.worksheet}!${input.range}`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to update cells"}`;
      }
    }
    case "append_rows": {
      try {
        const fileId = await resolveGoogleFileId(token, folderId, input.path as string);
        const rows = input.values as string[][];
        await googleClient.appendRows(token, fileId, input.worksheet as string, rows);
        return `Appended ${rows.length} row(s) to ${input.worksheet}`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to append rows"}`;
      }
    }
    case "read_document": {
      try {
        const fileId = await resolveGoogleFileId(token, folderId, input.path as string);
        const doc = await googleClient.getDocument(token, fileId);
        return `# ${doc.title}\n\n${doc.content}`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to read document"}`;
      }
    }
    case "update_document": {
      try {
        const fileId = await resolveGoogleFileId(token, folderId, input.path as string);
        await googleClient.updateDocument(token, fileId, input.content as string);
        return `Document updated: ${input.path}`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to update document"}`;
      }
    }
    case "create_document": {
      try {
        const result = await googleClient.createDocument(
          token, input.title as string, (input.content as string) ?? "", folderId,
        );
        return `Document created: ${input.title} (ID: ${result.documentId})`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to create document"}`;
      }
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

// ── OneDrive execution ───────────────────────────────────────────────────

async function executeOneDriveTool(
  name: string,
  input: Record<string, unknown>,
  ctx: StorageToolContext,
): Promise<string> {
  const { token, folderId } = ctx;

  switch (name) {
    case "read_file": {
      try {
        const itemId = await resolveOneDriveItemId(token, folderId, input.path as string);
        const { content } = await onedriveClient.getFile(token, itemId);
        return addLineNumbers(content);
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to read file"}`;
      }
    }
    case "write_file": {
      try {
        const files = await onedriveClient.listFiles(token, folderId);
        const existing = files.find(
          (f) => f.name.toLowerCase() === (input.path as string).toLowerCase(),
        );
        if (existing) {
          await onedriveClient.updateFile(token, existing.id, input.content as string);
          return `File updated: ${input.path}`;
        }
        const result = await onedriveClient.createFile(
          token, folderId, input.path as string, input.content as string,
        );
        fileIdCache.set(input.path as string, result.id);
        return `File created: ${input.path}`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to write file"}`;
      }
    }
    case "edit_file": {
      try {
        const itemId = await resolveOneDriveItemId(token, folderId, input.path as string);
        const { content } = await onedriveClient.getFile(token, itemId);
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
        await onedriveClient.updateFile(token, itemId, updated);
        return `File edited: ${input.path}`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to edit file"}`;
      }
    }
    case "list_files": {
      try {
        const files = await onedriveClient.listFiles(token, folderId);
        if (files.length === 0) return "No files found";
        for (const f of files) fileIdCache.set(f.name, f.id);
        return files
          .map((f) => `${f.name}  [id: ${f.id}]  (${f.file?.mimeType ?? "folder"})`)
          .join("\n");
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to list files"}`;
      }
    }
    case "search_files": {
      try {
        const files = await onedriveClient.searchFiles(token, input.query as string);
        if (files.length === 0) return "No matches found";
        for (const f of files) fileIdCache.set(f.name, f.id);
        return files
          .map((f) => `${f.name}  [id: ${f.id}]  (${f.file?.mimeType ?? "folder"})`)
          .join("\n");
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Search failed"}`;
      }
    }
    case "read_spreadsheet": {
      try {
        const itemId = await resolveOneDriveItemId(token, folderId, input.path as string);
        const data = await onedriveClient.getWorkbook(token, itemId);
        const output = data.worksheets.map((ws) => {
          const header = `## ${ws.name}\n`;
          const table = ws.values.map((row) => row.join("\t")).join("\n");
          return header + table;
        }).join("\n\n");
        return output || "Empty workbook";
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to read spreadsheet"}`;
      }
    }
    case "update_cells": {
      try {
        const itemId = await resolveOneDriveItemId(token, folderId, input.path as string);
        await onedriveClient.updateRange(
          token, itemId, input.worksheet as string,
          input.range as string, input.values as string[][],
        );
        return `Cells updated: ${input.worksheet}!${input.range}`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to update cells"}`;
      }
    }
    case "append_rows": {
      try {
        const itemId = await resolveOneDriveItemId(token, folderId, input.path as string);
        const rows = input.values as string[][];
        await onedriveClient.appendRows(
          token, itemId, input.worksheet as string, rows,
        );
        return `Appended ${rows.length} row(s) to ${input.worksheet}`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : "Failed to append rows"}`;
      }
    }
    case "read_document":
    case "update_document":
    case "create_document":
      return `The ${name} tool is only available with Google Drive. For OneDrive, use read_file/write_file/edit_file for Word documents.`;
    default:
      return `Unknown tool: ${name}`;
  }
}

// ── Public ──────────────────────────────────────────────────────────────

export function createStorageToolSet(ctx: StorageToolContext): ToolSet {
  return {
    definitions: [...STORAGE_TOOLS],
    execute: async (name: string, input: Record<string, unknown>): Promise<string> => {
      try {
        if (ctx.provider === "google") {
          return await executeGoogleTool(name, input, ctx);
        }
        return await executeOneDriveTool(name, input, ctx);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        return `Error in ${name}: ${error.message}`;
      }
    },
  };
}
