/**
 * GitLab task list parser — re-exports from the shared parser.
 * GitLab issues use standard markdown task lists (`- [ ]` / `- [x]`).
 */
export { parseTaskList, toggleTaskItem } from "#/lib/tasks/parser";
export type { ParsedTask } from "#/lib/tasks/parser";
