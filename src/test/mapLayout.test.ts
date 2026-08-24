import { describe, expect, it } from "vitest";
import { MAP_SEARCH_OVERLAY_CLASS } from "@/lib/mapLayout";

describe("shared map search layout", () => {
  it("reserves the Leaflet top-left control gutter", () => {
    expect(MAP_SEARCH_OVERLAY_CLASS).toContain("top-2");
    expect(MAP_SEARCH_OVERLAY_CLASS).toContain("left-12");
    expect(MAP_SEARCH_OVERLAY_CLASS).toContain("right-12");
    expect(MAP_SEARCH_OVERLAY_CLASS).not.toContain("left-2");
  });
});
