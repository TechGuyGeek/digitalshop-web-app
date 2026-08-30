import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light" }) }));
vi.mock("sonner", () => ({
  Toaster: ({ position, duration, closeButton, visibleToasts }: { position?: string; duration?: number; closeButton?: boolean; visibleToasts?: number }) => (
    <output data-testid="sonner" data-position={position} data-duration={duration} data-close-button={String(closeButton)} data-visible-toasts={visibleToasts} />
  ),
  toast: {},
}));

import { Toaster } from "@/components/ui/sonner";

describe("shared Sonner toast configuration", () => {
  it.each([1280, 375])("uses one closeable, short top-right notification at %ipx", (width) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    render(<Toaster />);

    const toaster = screen.getByTestId("sonner");
    expect(toaster).toHaveAttribute("data-position", "top-right");
    expect(toaster).toHaveAttribute("data-duration", "2000");
    expect(toaster).toHaveAttribute("data-close-button", "true");
    expect(toaster).toHaveAttribute("data-visible-toasts", "1");
  });
});
