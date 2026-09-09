import { describe, expect, it } from "vitest";
import { buildProductMediaSequence } from "@/lib/productMedia";

describe("product media ordering contract", () => {
  it("places the Pro YouTube video before the ordered image gallery", () => {
    expect(buildProductMediaSequence(["first.jpg", "second.jpg"], "M7lc1UVf-VE")).toEqual([
      { kind: "video", id: "M7lc1UVf-VE" },
      { kind: "image", path: "first.jpg" },
      { kind: "image", path: "second.jpg" },
    ]);
  });

  it("keeps image order and omits an absent video", () => {
    expect(buildProductMediaSequence(["", "primary.jpg", "third.jpg"], null)).toEqual([
      { kind: "image", path: "primary.jpg" },
      { kind: "image", path: "third.jpg" },
    ]);
  });
});
