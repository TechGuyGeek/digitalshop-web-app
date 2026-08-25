import { describe, expect, it } from "vitest";
import { groupCompanyOrders } from "@/lib/companyOrders";
import { hasCustomerCancellation, type V1Order } from "@/lib/orderApi";
import { gpsShopsShareDescription } from "@/lib/branding";

const order: V1Order = {
  id: "0123456789abcdef0123456789abcdef",
  company_id: 82,
  customer_id: 42,
  date_time: "2026-08-24 13:29:18",
  table_number: "4",
  mode: "onsite",
  paid: false,
  delivered: false,
  cancel_requested: true,
  cancellation_status: "requested",
  company_name: "Test Shop",
  total: "5.00",
  items: [{ product_id: 7, group_id: 3, name: "Tea", description: "", price: "5.00", image_path: null, quantity: 1 }],
};

describe("Stage 5 owner cancellation and share branding", () => {
  it("retains trusted checkout grouping and canonical cancellation state through owner rows", () => {
    const rows = groupCompanyOrders([{
      companyid: "82", clientid: "42", orderid: "1001", RandomeCode: order.id,
      DateandTime: order.date_time, Name: "Customer", Surname: "Test",
      cancellation_status: "requested", cancel_requested: true, OrderPrice: "5.00",
    }]);
    expect(rows[0]).toMatchObject({ reference: order.id, orderId: "1001", requestCancel: "1", cancellationStatus: "requested" });
    expect(hasCustomerCancellation(order)).toBe(true);
  });

  it("recognizes approved and rejected canonical states without frontend-only state", () => {
    expect(hasCustomerCancellation({ cancel_requested: false, cancellation_status: "approved" })).toBe(true);
    expect(hasCustomerCancellation({ cancel_requested: false, cancellation_status: "rejected" })).toBe(false);
  });

  it("changes only the known demo share copy to GPS Shops", () => {
    expect(gpsShopsShareDescription("This is a demo shop to show what a shop could look like on Digital shop for testing purposes"))
      .toBe("This is a demo shop to show what a shop could look like on GPS Shops for testing purposes");
    expect(gpsShopsShareDescription("Digital shop is a stored business description")).toBe("Digital shop is a stored business description");
  });
});
