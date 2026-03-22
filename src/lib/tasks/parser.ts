/**
 * Shared markdown task list parser.
 * Used by both GitHub and GitLab, which both use `- [ ]` / `- [x]` syntax.
 */

export interface ParsedTask {
  index: number;
  text: string;
  checked: boolean;
  lineNumber: number;
}

/**
 * Parse `- [ ] item` / `- [x] item` task lists from a markdown body.
 */
export function parseTaskList(body: string | null): ParsedTask[] {
  if (!body) return [];

  const lines = body.split("\n");
  const tasks: ParsedTask[] = [];
  let taskIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*)-\s+\[([ xX])\]\s+(.*)/);
    if (match) {
      tasks.push({
        index: taskIndex++,
        text: match[3].trim(),
        checked: match[2] !== " ",
        lineNumber: i,
      });
    }
  }

  return tasks;
}

/**
 * Toggle a task item in a markdown body by its 0-based task index.
 * Returns the updated body string.
 */
export function toggleTaskItem(
  body: string,
  taskIndex: number,
  checked: boolean,
): string {
  const lines = body.split("\n");
  let currentTaskIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*-\s+\[)([ xX])(\]\s+.*)/);
    if (match) {
      if (currentTaskIndex === taskIndex) {
        lines[i] = `${match[1]}${checked ? "x" : " "}${match[3]}`;
        break;
      }
      currentTaskIndex++;
    }
  }

  return lines.join("\n");
}
