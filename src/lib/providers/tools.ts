import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { resolve, relative, isAbsolute, dirname } from "path";

const exec = promisify(execFile);

const MAX_OUTPUT_BYTES = 10 * 1024; // 10KB output truncation
const BASH_TIMEOUT_MS = 120_000; // 2 minutes

/**
 * Validate that a path stays within the project directory.
 */
function safePath(cwd: string, filePath: string): string {
  const resolved = isAbsolute(filePath)
    ? resolve(filePath)
    : resolve(cwd, filePath);
  const rel = relative(cwd, resolved);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Path "${filePath}" is outside the project directory`);
  }
  return resolved;
}

function truncate(text: string, maxBytes: number = MAX_OUTPUT_BYTES): string {
  if (Buffer.byteLength(text) <= maxBytes) return text;
  const truncated = Buffer.from(text).subarray(0, maxBytes).toString("utf8");
  return truncated + "\n... (output truncated)";
}

// ── Tool Definitions (JSON Schema for function calling) ─────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const CODING_TOOLS: ToolDefinition[] = [
  {
    name: "read_file",
    description:
      "Read the contents of a file. Returns the file text with line numbers.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to the project root",
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
    description: "Write content to a file, creating it if it does not exist.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to the project root",
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
          description: "File path relative to the project root",
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
    name: "bash",
    description:
      "Execute a shell command. Returns stdout and stderr. Use for running tests, installing packages, git operations, etc.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "The shell command to run" },
      },
      required: ["command"],
    },
  },
  {
    name: "search_files",
    description:
      "Search for a regex pattern in files. Returns matching lines with file paths and line numbers.",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Regex pattern to search for",
        },
        path: {
          type: "string",
          description:
            "Directory or file to search in (default: project root)",
        },
        glob: {
          type: "string",
          description: 'File glob filter (e.g. "*.ts", "*.py")',
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "list_files",
    description:
      "List files matching a glob pattern in the project directory.",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: 'Glob pattern (e.g. "src/**/*.ts", "*.json")',
        },
        path: {
          type: "string",
          description: "Directory to search in (default: project root)",
        },
      },
      required: ["pattern"],
    },
  },
];

// ── Tool Implementations ────────────────────────────────────────────────

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  cwd: string,
): Promise<string> {
  switch (name) {
    case "read_file":
      return readFile(
        cwd,
        input.path as string,
        input.offset as number | undefined,
        input.limit as number | undefined,
      );
    case "write_file":
      return writeFile(cwd, input.path as string, input.content as string);
    case "edit_file":
      return editFile(
        cwd,
        input.path as string,
        input.old_text as string,
        input.new_text as string,
      );
    case "bash":
      return runBash(cwd, input.command as string);
    case "search_files":
      return searchFiles(
        cwd,
        input.pattern as string,
        input.path as string | undefined,
        input.glob as string | undefined,
      );
    case "list_files":
      return listFiles(
        cwd,
        input.pattern as string,
        input.path as string | undefined,
      );
    default:
      return `Unknown tool: ${name}`;
  }
}

function readFile(
  cwd: string,
  filePath: string,
  offset?: number,
  limit?: number,
): string {
  const absPath = safePath(cwd, filePath);
  if (!existsSync(absPath)) return `File not found: ${filePath}`;
  if (statSync(absPath).isDirectory()) return `${filePath} is a directory`;

  const content = readFileSync(absPath, "utf8");
  const lines = content.split("\n");

  const start = Math.max(0, (offset ?? 1) - 1);
  const end = limit ? start + limit : lines.length;
  const slice = lines.slice(start, end);

  const numbered = slice.map(
    (line, i) => `${String(start + i + 1).padStart(5)} ${line}`,
  );
  return truncate(numbered.join("\n"));
}

function writeFile(cwd: string, filePath: string, content: string): string {
  const absPath = safePath(cwd, filePath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, content, "utf8");
  return `File written: ${filePath}`;
}

function editFile(
  cwd: string,
  filePath: string,
  oldText: string,
  newText: string,
): string {
  const absPath = safePath(cwd, filePath);
  if (!existsSync(absPath)) return `File not found: ${filePath}`;

  const content = readFileSync(absPath, "utf8");
  if (!content.includes(oldText)) {
    return `old_text not found in ${filePath}. Make sure it matches exactly.`;
  }

  const count = content.split(oldText).length - 1;
  if (count > 1) {
    return `old_text matches ${count} locations in ${filePath}. Provide more context to make it unique.`;
  }

  const updated = content.replace(oldText, newText);
  writeFileSync(absPath, updated, "utf8");
  return `File edited: ${filePath}`;
}

async function runBash(cwd: string, command: string): Promise<string> {
  try {
    const { stdout, stderr } = await exec("bash", ["-c", command], {
      cwd,
      timeout: BASH_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES * 2,
    });
    let result = "";
    if (stdout.trim()) result += stdout;
    if (stderr.trim()) result += (result ? "\n" : "") + `STDERR: ${stderr}`;
    return truncate(result || "(no output)");
  } catch (err) {
    const error = err as { stdout?: string; stderr?: string; message: string };
    let result = "";
    if (error.stdout) result += error.stdout;
    if (error.stderr) result += (result ? "\n" : "") + `STDERR: ${error.stderr}`;
    return truncate(result || `Error: ${error.message}`);
  }
}

async function searchFiles(
  cwd: string,
  pattern: string,
  searchPath?: string,
  glob?: string,
): Promise<string> {
  const target = searchPath ? safePath(cwd, searchPath) : cwd;
  const args = ["--line-number", "--no-heading", "--color=never", pattern, target];
  if (glob) args.push("--glob", glob);

  try {
    const { stdout } = await exec("rg", args, {
      cwd,
      timeout: 30_000,
      maxBuffer: MAX_OUTPUT_BYTES * 2,
    });
    return truncate(stdout || "No matches found");
  } catch {
    return "No matches found";
  }
}

async function listFiles(cwd: string, pattern: string, searchPath?: string): Promise<string> {
  const target = searchPath ? safePath(cwd, searchPath) : cwd;
  try {
    const { stdout } = await exec("find", [target, "-name", pattern, "-type", "f"], {
      timeout: 10_000,
      maxBuffer: MAX_OUTPUT_BYTES,
    });
    const output = stdout.trim();
    return truncate(output || "No files found");
  } catch {
    return "No files found";
  }
}
