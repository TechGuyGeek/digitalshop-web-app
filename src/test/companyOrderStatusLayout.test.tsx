import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusRow } from "@/pages/CompanyOrderDetail";

describe("Company Order Detail status rows", () => {
  it("renders Payment Status and Delivery Status as separate aligned rows", () => {
    render(<div className="w-64"><StatusRow label="Payment Status:" value="Paid" testId="payment-status" /><StatusRow label="Delivery Status:" value="Delivered" testId="delivery-status" /></div>);

    expect(screen.getByTestId("payment-status")).toHaveTextContent("Payment Status:Paid");
    expect(screen.getByTestId("delivery-status")).toHaveTextContent("Delivery Status:Delivered");
    expect(screen.getByTestId("payment-status").className).toContain("grid-cols-[minmax(0,1fr)_auto]");
    expect(screen.getByTestId("delivery-status").className).toContain("grid-cols-[minmax(0,1fr)_auto]");
  });
});
