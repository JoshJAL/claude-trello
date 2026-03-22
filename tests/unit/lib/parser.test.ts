import { describe, it, expect } from "vitest";
import { parseTaskList, toggleTaskItem } from "#/lib/tasks/parser";

describe("parseTaskList", () => {
  it("parses unchecked items", () => {
    const body = "- [ ] First task\n- [ ] Second task";
    const tasks = parseTaskList(body);
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toEqual({
      index: 0,
      text: "First task",
      checked: false,
      lineNumber: 0,
    });
    expect(tasks[1]).toEqual({
      index: 1,
      text: "Second task",
      checked: false,
      lineNumber: 1,
    });
  });

  it("parses checked items (lowercase x)", () => {
    const body = "- [x] Done task";
    const tasks = parseTaskList(body);
    expect(tasks[0].checked).toBe(true);
  });

  it("parses checked items (uppercase X)", () => {
    const body = "- [X] Done task";
    const tasks = parseTaskList(body);
    expect(tasks[0].checked).toBe(true);
  });

  it("handles mixed checked and unchecked", () => {
    const body = "- [x] Done\n- [ ] Todo\n- [X] Also done";
    const tasks = parseTaskList(body);
    expect(tasks.map((t) => t.checked)).toEqual([true, false, true]);
  });

  it("ignores non-task lines", () => {
    const body = "# Header\nSome text\n- [ ] Task\n\nMore text";
    const tasks = parseTaskList(body);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].text).toBe("Task");
    expect(tasks[0].lineNumber).toBe(2);
  });

  it("handles indented tasks", () => {
    const body = "  - [ ] Indented task";
    const tasks = parseTaskList(body);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].text).toBe("Indented task");
  });

  it("returns empty array for null body", () => {
    expect(parseTaskList(null)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseTaskList("")).toEqual([]);
  });

  it("returns empty array for body with no tasks", () => {
    expect(parseTaskList("Just some text\nNo tasks here")).toEqual([]);
  });

  it("trims task text", () => {
    const body = "- [ ]   Extra spaces  ";
    const tasks = parseTaskList(body);
    expect(tasks[0].text).toBe("Extra spaces");
  });
});

describe("toggleTaskItem", () => {
  it("checks an unchecked item", () => {
    const body = "- [ ] First\n- [ ] Second";
    const result = toggleTaskItem(body, 0, true);
    expect(result).toBe("- [x] First\n- [ ] Second");
  });

  it("unchecks a checked item", () => {
    const body = "- [x] First\n- [ ] Second";
    const result = toggleTaskItem(body, 0, false);
    expect(result).toBe("- [ ] First\n- [ ] Second");
  });

  it("toggles the correct item by index", () => {
    const body = "- [ ] First\n- [ ] Second\n- [ ] Third";
    const result = toggleTaskItem(body, 1, true);
    expect(result).toBe("- [ ] First\n- [x] Second\n- [ ] Third");
  });

  it("preserves non-task lines", () => {
    const body = "# Title\n- [ ] Task\nText";
    const result = toggleTaskItem(body, 0, true);
    expect(result).toBe("# Title\n- [x] Task\nText");
  });

  it("handles already-toggled state (no-op)", () => {
    const body = "- [x] Already done";
    const result = toggleTaskItem(body, 0, true);
    expect(result).toBe("- [x] Already done");
  });

  it("leaves body unchanged for out-of-range index", () => {
    const body = "- [ ] Only one";
    const result = toggleTaskItem(body, 5, true);
    expect(result).toBe("- [ ] Only one");
  });
});
