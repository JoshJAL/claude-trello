import { describe, it, expect } from "vitest";
import {
  generatePrBody,
  generateShortBranchName,
  countTasks,
  extractIssueNumbers,
  parsePrAutomationConfig,
} from "#/lib/pr";
import type { BoardData } from "#/lib/types";

const mockBoardData: BoardData = {
  board: { id: "board1", name: "Test Board" },
  cards: [
    {
      id: "1",
      name: "Add login",
      desc: "",
      checklists: [
        {
          id: "cl1",
          name: "Tasks",
          checkItems: [
            { id: "ci1", name: "Create form", state: "complete" },
            { id: "ci2", name: "Add validation", state: "incomplete" },
          ],
        },
      ],
    },
    {
      id: "2",
      name: "Fix bug #42",
      desc: "",
      checklists: [
        {
          id: "cl2",
          name: "Tasks",
          checkItems: [
            { id: "ci3", name: "Reproduce", state: "incomplete" },
          ],
        },
      ],
    },
  ],
};

describe("countTasks", () => {
  it("counts completed and total tasks", () => {
    const { completed, total } = countTasks(mockBoardData);
    expect(total).toBe(3);
    expect(completed).toBe(1);
  });

  it("handles empty board", () => {
    const { completed, total } = countTasks({
      board: { id: "x", name: "X" },
      cards: [],
    });
    expect(total).toBe(0);
    expect(completed).toBe(0);
  });
});

describe("extractIssueNumbers", () => {
  it("extracts numeric card IDs", () => {
    const numbers = extractIssueNumbers(mockBoardData);
    expect(numbers).toEqual([1, 2]);
  });

  it("skips non-numeric IDs", () => {
    const data: BoardData = {
      board: { id: "b", name: "B" },
      cards: [
        { id: "abc", name: "Card", desc: "", checklists: [] },
        { id: "5", name: "Issue 5", desc: "", checklists: [] },
      ],
    };
    const numbers = extractIssueNumbers(data);
    expect(numbers).toEqual([5]);
  });
});

describe("generateShortBranchName", () => {
  it("uses the pattern with replacements", () => {
    const branch = generateShortBranchName(
      "taskpilot/{source}-{id}-{slug}",
      "github",
      "board123",
      "Add login feature",
    );
    expect(branch).toBe("taskpilot/github-board123-add-login-feature");
  });

  it("slugifies the title", () => {
    const branch = generateShortBranchName(
      "tp/{slug}",
      "trello",
      "x",
      "Fix: Bug #42 (urgent!)",
    );
    expect(branch).toMatch(/^tp\/fix-bug-42-urgent/);
  });

  it("truncates long slugs", () => {
    const longTitle = "A".repeat(200);
    const branch = generateShortBranchName("b/{slug}", "github", "x", longTitle);
    expect(branch.length).toBeLessThanOrEqual(100);
  });
});

describe("generatePrBody", () => {
  it("includes source info", () => {
    const body = generatePrBody({
      source: "github",
      boardName: "my-repo",
      tasksCompleted: 3,
      tasksTotal: 5,
      providerName: "Claude",
      mode: "sequential",
      durationMs: 60000,
    });
    expect(body).toContain("github");
    expect(body).toContain("my-repo");
    expect(body).toContain("3/5");
    expect(body).toContain("Claude");
    expect(body).toContain("TaskPilot");
  });

  it("adds Closes references when autoLinkIssue is true", () => {
    const body = generatePrBody({
      source: "github",
      boardName: "repo",
      tasksCompleted: 1,
      tasksTotal: 1,
      providerName: "Claude",
      mode: "sequential",
      durationMs: 1000,
      issueNumbers: [42, 43],
      autoLinkIssue: true,
    });
    expect(body).toContain("Closes #42");
    expect(body).toContain("Closes #43");
  });

  it("omits Closes references when autoLinkIssue is false", () => {
    const body = generatePrBody({
      source: "github",
      boardName: "repo",
      tasksCompleted: 1,
      tasksTotal: 1,
      providerName: "Claude",
      mode: "sequential",
      durationMs: 1000,
      issueNumbers: [42],
      autoLinkIssue: false,
    });
    expect(body).not.toContain("Closes #42");
  });
});

describe("parsePrAutomationConfig", () => {
  it("parses valid JSON", () => {
    const config = parsePrAutomationConfig(
      JSON.stringify({ enabled: true, autoDraft: false, autoLinkIssue: true, branchNamingPattern: "x/{slug}" }),
    );
    expect(config?.enabled).toBe(true);
    expect(config?.autoDraft).toBe(false);
  });

  it("returns null for null input", () => {
    expect(parsePrAutomationConfig(null)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parsePrAutomationConfig("not json")).toBeNull();
  });

  it("parses any valid JSON (no strict object check)", () => {
    // The function uses JSON.parse which accepts any valid JSON
    const result = parsePrAutomationConfig('"string"');
    expect(result).toBe("string");
  });
});
