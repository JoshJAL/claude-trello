import { readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { resolve, relative, isAbsolute } from "path";

const exec = promisify(execFile);
const MAX_OUTPUT_BYTES = 10 * 1024;
const BASH_TIMEOUT_MS = 120_000;

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
  return Buffer.from(text).subarray(0, maxBytes).toString("utf8") + "\n... (output truncated)";
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const CODING_TOOLS: ToolDefinition[] = [
  {
    name: "read_file",
    description: "Read file contents with line numbers.",
    parameters: { type: "object", properties: { path: { type: "string" }, offset: { type: "number" }, limit: { type: "number" } }, required: ["path"] },
  },
  {
    name: "write_file",
    description: "Write content to a file.",
    parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] },
  },
  {
    name: "edit_file",
    description: "Replace exact text in a file.",
    parameters: { type: "object", properties: { path: { type: "string" }, old_text: { type: "string" }, new_text: { type: "string" } }, required: ["path", "old_text", "new_text"] },
  },
  {
    name: "bash",
    description: "Execute a shell command.",
    parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] },
  },
  {
    name: "search_files",
    description: "Search for regex patterns in files.",
    parameters: { type: "object", properties: { pattern: { type: "string" }, path: { type: "string" }, glob: { type: "string" } }, required: ["pattern"] },
  },
  {
    name: "list_files",
    description: "List files matching a glob pattern.",
    parameters: { type: "object", properties: { pattern: { type: "string" }, path: { type: "string" } }, required: ["pattern"] },
  },
];

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  cwd: string,
): Promise<string> {
  switch (name) {
    case "read_file": {
      const absPath = safePath(cwd, input.path as string);
      if (!existsSync(absPath)) return `File not found: ${input.path}`;
      if (statSync(absPath).isDirectory()) return `${input.path} is a directory`;
      const content = readFileSync(absPath, "utf8");
      const lines = content.split("\n");
      const start = Math.max(0, ((input.offset as number) ?? 1) - 1);
      const end = input.limit ? start + (input.limit as number) : lines.length;
      return truncate(lines.slice(start, end).map((l, i) => `${String(start + i + 1).padStart(5)} ${l}`).join("\n"));
    }
    case "write_file": {
      const absPath = safePath(cwd, input.path as string);
      writeFileSync(absPath, input.content as string, "utf8");
      return `File written: ${input.path}`;
    }
    case "edit_file": {
      const absPath = safePath(cwd, input.path as string);
      if (!existsSync(absPath)) return `File not found: ${input.path}`;
      const content = readFileSync(absPath, "utf8");
      const oldText = input.old_text as string;
      if (!content.includes(oldText)) return `old_text not found in ${input.path}`;
      const count = content.split(oldText).length - 1;
      if (count > 1) return `old_text matches ${count} locations. Provide more context.`;
      writeFileSync(absPath, content.replace(oldText, input.new_text as string), "utf8");
      return `File edited: ${input.path}`;
    }
    case "bash": {
      try {
        const { stdout, stderr } = await exec("bash", ["-c", input.command as string], { cwd, timeout: BASH_TIMEOUT_MS, maxBuffer: MAX_OUTPUT_BYTES * 2 });
        let result = stdout.trim() ? stdout : "";
        if (stderr.trim()) result += (result ? "\n" : "") + `STDERR: ${stderr}`;
        return truncate(result || "(no output)");
      } catch (err) {
        const e = err as { stdout?: string; stderr?: string; message: string };
        return truncate((e.stdout ?? "") + (e.stderr ? `\nSTDERR: ${e.stderr}` : "") || `Error: ${e.message}`);
      }
    }
    case "search_files": {
      const target = input.path ? safePath(cwd, input.path as string) : cwd;
      const args = ["--line-number", "--no-heading", "--color=never", input.pattern as string, target];
      if (input.glob) args.push("--glob", input.glob as string);
      try {
        const { stdout } = await exec("rg", args, { cwd, timeout: 30_000, maxBuffer: MAX_OUTPUT_BYTES * 2 });
        return truncate(stdout || "No matches found");
      } catch { return "No matches found"; }
    }
    case "list_files": {
      try {
        const target = input.path ? safePath(cwd, input.path as string) : cwd;
        const { stdout } = await exec("find", [target, "-name", input.pattern as string, "-type", "f"], { timeout: 10_000, maxBuffer: MAX_OUTPUT_BYTES });
        return truncate(stdout.trim() || "No files found");
      } catch { return "No files found"; }
    }
    default:
      return `Unknown tool: ${name}`;
  }
}
