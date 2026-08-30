import { describe, expect, it } from "vitest";
import { normalizeAppBase } from "@/lib/appBase";

describe("Vite application base", () => {
  it.each([
    [undefined, "/"],
    ["gpsshops-live", "/gpsshops-live/"],
    ["/gpsshops-live", "/gpsshops-live/"],
    ["/gpsshops-live/", "/gpsshops-live/"],
  ])("normalizes %j to %s", (value, expected) => {
    expect(normalizeAppBase(value)).toBe(expected);
  });
});
