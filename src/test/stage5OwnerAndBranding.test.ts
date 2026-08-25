import { readFileSync } from "node:fs";
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

  it.each([
    ["canonical requested", { cancel_requested: true, cancellation_status: "requested" }, "requested", "1"],
    ["canonical approved", { cancel_requested: true, cancellation_status: "approved" }, "approved", "1"],
    ["canonical rejected", { cancel_requested: false, cancellation_status: "rejected" }, "rejected", "1"],
    ["legacy request without header", { RequestCancel: "1" }, "none", "1"],
    ["no cancellation", {}, "none", "0"],
  ] as const)("keeps %s visible in the grouped owner state", (_label, row, status, requested) => {
    const [group] = groupCompanyOrders([{
      companyid: "82", clientid: "42", orderid: "1001", RandomeCode: order.id,
      DateandTime: order.date_time, ...row, OrderPrice: "5.00",
    }]);
    expect(group).toMatchObject({ cancellationStatus: status, requestCancel: requested });
  });

  it("aggregates cancellation state across all lines in a grouped checkout", () => {
    const [group] = groupCompanyOrders([
      { companyid: "82", clientid: "42", orderid: "1001", RandomeCode: order.id, DateandTime: order.date_time, OrderPrice: "2.00" },
      { companyid: "82", clientid: "42", orderid: "1002", RandomeCode: order.id, DateandTime: order.date_time, RequestCancel: "1", OrderPrice: "3.00" },
    ]);
    expect(group).toMatchObject({ cancellationStatus: "none", requestCancel: "1" });
  });

  it("keeps owner list product imagery separate from the customer image", () => {
    const grouped = groupCompanyOrders([{
      companyid: "82", clientid: "42", orderid: "1001", RandomeCode: order.id, DateandTime: order.date_time,
      customer_imagepath: "/Images/UserProfile/customer.jpg", product_imagepath: "/Images/Menu/tea.jpg", OrderPrice: "5.00",
    }]);
    expect(grouped[0].customerImagePath).toBe("/Images/UserProfile/customer.jpg");
    expect(grouped[0].items[0].product_imagepath).toBe("/Images/Menu/tea.jpg");
    const source = readFileSync("src/pages/CompanyOrders.tsx", "utf8");
    expect(source).toContain('variant="product"');
    expect(source).toContain("product_imagepath");
  });

  it("keeps Add Product gallery and camera on separate paths", () => {
    const source = readFileSync("src/pages/AddProduct.tsx", "utf8");
    expect(source).toContain("WebcamCapture");
    expect(source).toContain("setWebcamOpen(true)");
    expect(source).toContain("cameraInputRef.current?.click()");
    expect(source).toContain("fileInputRef.current?.click()");
    expect(source).toContain('capture="environment"');
    expect(source).toContain("onCapture={handleWebcamCapture}");
    expect(readFileSync("src/components/WebcamCapture.tsx", "utf8")).toContain("getUserMedia");
    expect(readFileSync("src/components/WebcamCapture.tsx", "utf8")).toContain("Could not access camera");
  });

  it("changes only the known demo share copy to GPS Shops", () => {
    expect(gpsShopsShareDescription("This is a demo shop to show what a shop could look like on Digital shop for testing purposes"))
      .toBe("This is a demo shop to show what a shop could look like on GPS Shops for testing purposes");
    expect(gpsShopsShareDescription("Digital shop is a stored business description")).toBe("Digital shop is a stored business description");
  });
});
