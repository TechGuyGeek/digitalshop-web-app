import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderStatusRows } from "@/components/OrderStatusRows";

describe("Customer Order Detail status rows", () => {
  it("keeps translated current status values on two responsive aligned rows", () => {
    render(<div className="w-64"><OrderStatusRows paymentLabel="Payment Status:" paymentValue="Not Paid" deliveryLabel="Delivery Status:" deliveryValue="Delivered" /></div>);

    expect(screen.getByTestId("payment-status")).toHaveTextContent("Payment Status:Not Paid");
    expect(screen.getByTestId("delivery-status")).toHaveTextContent("Delivery Status:Delivered");
    expect(screen.getByTestId("payment-status").className).toContain("grid-cols-[minmax(0,1fr)_auto]");
    expect(screen.getByTestId("delivery-status").className).toContain("grid-cols-[minmax(0,1fr)_auto]");
  });
});
