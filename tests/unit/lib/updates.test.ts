import { describe, it, expect } from "vitest";
import { UPDATES, getUnseenUpdates, getLatestUpdateDate } from "#/lib/updates";

describe("UPDATES array", () => {
  it("is sorted newest-first", () => {
    for (let i = 1; i < UPDATES.length; i++) {
      expect(new Date(UPDATES[i - 1].date).getTime()).toBeGreaterThanOrEqual(
        new Date(UPDATES[i].date).getTime(),
      );
    }
  });

  it("has unique IDs", () => {
    const ids = UPDATES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all entries have required fields", () => {
    for (const update of UPDATES) {
      expect(update.id).toBeTruthy();
      expect(update.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(update.title).toBeTruthy();
      expect(update.description).toBeTruthy();
      expect(["feature", "improvement", "fix"]).toContain(update.type);
    }
  });
});

describe("getUnseenUpdates", () => {
  it("returns all updates when lastSeenAt is null", () => {
    const unseen = getUnseenUpdates(null);
    expect(unseen).toEqual(UPDATES);
  });

  it("returns no updates when lastSeenAt is in the future", () => {
    const future = new Date("2099-01-01");
    const unseen = getUnseenUpdates(future);
    expect(unseen).toHaveLength(0);
  });

  it("returns only updates newer than lastSeenAt", () => {
    // Find a date that splits the list
    if (UPDATES.length >= 2) {
      const midDate = new Date(UPDATES[Math.floor(UPDATES.length / 2)].date);
      const unseen = getUnseenUpdates(midDate);
      expect(unseen.length).toBeLessThan(UPDATES.length);
      for (const u of unseen) {
        expect(new Date(u.date).getTime()).toBeGreaterThan(midDate.getTime());
      }
    }
  });
});

describe("getLatestUpdateDate", () => {
  it("returns a Date object", () => {
    const date = getLatestUpdateDate();
    expect(date).toBeInstanceOf(Date);
  });

  it("matches the first update's date", () => {
    const date = getLatestUpdateDate();
    expect(date.toISOString().startsWith(UPDATES[0].date)).toBe(true);
  });
});
