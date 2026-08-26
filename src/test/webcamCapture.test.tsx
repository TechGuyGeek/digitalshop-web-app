import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebcamCapture from "@/components/WebcamCapture";

describe("WebcamCapture camera failures", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["permission denial", { getUserMedia: vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")) }],
    ["unavailable camera", undefined],
  ])("shows a useful error for %s without opening Gallery", async (_label, mediaDevices) => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: mediaDevices });

    render(<WebcamCapture open onOpenChange={vi.fn()} onCapture={vi.fn()} />);

    expect(await screen.findByText("Could not access camera. Please allow camera permissions.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gallery" })).not.toBeInTheDocument();
  });
});
