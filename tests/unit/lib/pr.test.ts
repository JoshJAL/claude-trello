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
  it("uses the default pattern with type and provider", () => {
    const branch = generateShortBranchName(
      "{type}/{provider}-{slug}",
      "github",
      "123",
      "Add login feature",
      "claude",
    );
    expect(branch).toBe("feature/claude-add-login-feature");
  });

  it("infers bug type from title", () => {
    const branch = generateShortBranchName(
      "{type}/{provider}-{slug}",
      "github",
      "42",
      "Fix broken auth flow",
      "openai",
    );
    expect(branch).toBe("bug/openai-fix-broken-auth-flow");
  });

  it("slugifies and truncates the title", () => {
    const branch = generateShortBranchName(
      "{type}/{provider}-{slug}",
      "trello",
      "x",
      "Fix: Bug #42 (urgent!)",
      "groq",
    );
    expect(branch).toBe("bug/groq-fix-bug-42-urgent");
  });

  it("truncates long slugs to 30 chars", () => {
    const longTitle = "Add a really long feature name that goes on and on forever";
    const branch = generateShortBranchName("{type}/{slug}", "github", "x", longTitle);
    const slug = branch.split("/")[1];
    expect(slug.length).toBeLessThanOrEqual(30);
  });

  it("supports source and id variables", () => {
    const branch = generateShortBranchName(
      "{type}/{source}-{id}-{slug}",
      "gitlab",
      "99",
      "Update docs",
      "claude",
    );
    expect(branch).toBe("feature/gitlab-99-update-docs");
  });

  it("defaults provider to claude", () => {
    const branch = generateShortBranchName(
      "{type}/{provider}-{slug}",
      "github",
      "1",
      "Add feature",
    );
    expect(branch).toBe("feature/claude-add-feature");
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
