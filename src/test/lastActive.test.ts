import { describe, expect, it } from "vitest";
import { formatLastActive, resolveLastActive } from "@/lib/lastActive";

const now = new Date("2026-09-09T12:00:00Z");

describe("Last Active presentation contract", () => {
  it("uses the native green threshold through one elapsed UTC day", () => {
    expect(resolveLastActive("2026-09-08T12:00:00Z", now)).toEqual({ tone: "green", daysAgo: 1 });
    expect(resolveLastActive("2026-09-08T12:00:00.001Z", now).tone).toBe("green");
  });

  it("uses amber after one day through seven elapsed days", () => {
    expect(resolveLastActive("2026-09-08T11:59:59Z", now)).toEqual({ tone: "amber", daysAgo: 1 });
    expect(resolveLastActive("2026-09-02T12:00:00Z", now)).toEqual({ tone: "amber", daysAgo: 7 });
  });

  it("uses red after seven elapsed days and neutral for missing or invalid data", () => {
    expect(resolveLastActive("2026-09-02T11:59:59Z", now)).toEqual({ tone: "red", daysAgo: 7 });
    expect(resolveLastActive(null, now)).toEqual({ tone: "neutral", daysAgo: null });
    expect(resolveLastActive("not-a-timestamp", now)).toEqual({ tone: "neutral", daysAgo: null });
  });

  it("parses the canonical UTC SQL form and formats safe fallbacks", () => {
    const status = resolveLastActive("2026-09-06 12:00:00", now);
    expect(status.tone).toBe("amber");
    expect(formatLastActive(status, (key) => key)).toBe("Last active 3 days ago");
    expect(formatLastActive({ tone: "neutral", daysAgo: null }, (key) => key)).toBe("Last active unavailable");
  });
});
