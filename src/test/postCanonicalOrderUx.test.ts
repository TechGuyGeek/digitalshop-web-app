import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { customerCancellationLabel, groupOrdersBySession } from "@/lib/orderHistory";
import { buildOrderQrPayload, orderQrTokenFromPayload } from "@/lib/v1Api";

const source = (path: string) => readFileSync(path, "utf8");
const translations: (key: string) => string = (key) => ({
  CancellationRequested: "Cancellation requested",
  CancellationApproved: "Cancellation approved",
  CancellationRejected: "Cancellation rejected",
} as Record<string, string>)[key] || key;

describe("post-canonical order UX safeguards", () => {
  it("uses one confirmation component for owner list and detail checkout deletion", () => {
    const list = source("src/pages/CompanyOrders.tsx");
    const detail = source("src/pages/CompanyOrderDetail.tsx");
    const confirmation = source("src/components/OrderDeleteConfirmation.tsx");
    expect(list).toContain("OrderDeleteConfirmation");
    expect(detail).toContain("OrderDeleteConfirmation");
    expect(detail).toContain("onClick={() => setDeleteConfirmOpen(true)}");
    expect(detail).not.toContain("onClick={() => void handleDelete()}");
    expect(confirmation).toContain('onClick={() => onOpenChange(false)}');
    expect(confirmation).toContain("onClick={onConfirm}");
  });

  it("confirms clear and removes the persisted basket only after confirmation", () => {
    const basket = source("src/pages/Basket.tsx");
    const context = source("src/contexts/BasketContext.tsx");
    expect(basket).toContain("setClearConfirmOpen(true)");
    expect(basket).toContain("clearBasket(); setClearConfirmOpen(false);");
    expect(basket).not.toContain("onClick={() => clearItem(item.id)}");
    expect(context).toContain("sessionStorage.removeItem(STORAGE_KEY)");
    expect(context).toContain("const clearBasket = () => setItems([])");
  });

  it("shows owner group product counts through the existing owner-menu usage contract", () => {
    const groups = source("src/pages/EditMenuGroups.tsx");
    expect(groups).toContain("getMenuGroupUsage(companyId, Number(group.ID))");
    expect(groups).toContain("usage.product_count");
    expect(groups).toContain('t("Products")');
  });

  it("restores the owner Scan Order QR entry and routes it through the existing scanner", () => {
    const orders = source("src/pages/CompanyOrders.tsx");
    const scanner = source("src/pages/QRScanner.tsx");
    const handoff = source("src/pages/OrderPayScan.tsx");
    expect(orders).toContain('/qr-scanner?mode=order');
    expect(orders).toContain('t("ScanOrderQr")');
    expect(scanner).toContain('params.get("mode") === "order"');
    expect(scanner).toContain("resolveOrderPaymentQr(token)");
    expect(handoff).toContain("scan_reference=");
    expect(handoff).not.toContain("company-order-detail?id=");
  });

  it("accepts only the emitted opaque staging order QR payload", () => {
    const token = "AbCdEf0123456789_-AbCdEf0123456789";
    const payload = buildOrderQrPayload(token);
    const shortPayload = new URL(payload); shortPayload.searchParams.set("t", "short");
    expect(orderQrTokenFromPayload(payload)).toBe(token);
    expect(orderQrTokenFromPayload(shortPayload.toString())).toBeNull();
    expect(orderQrTokenFromPayload("https://example.test/order-pay-scan?t=" + token)).toBeNull();
  });

  it("projects canonical cancellation final states while leaving legacy request-only history safe", () => {
    const canonical = groupOrdersBySession([{ RandomeCode: "0123456789abcdef", cancellation_status: "approved", cancel_requested: 1 }]);
    const rejected = groupOrdersBySession([{ RandomeCode: "fedcba9876543210", cancellation_status: "rejected", cancel_requested: 0 }]);
    const legacy = groupOrdersBySession([{ RandomeCode: "abcdefghijklmnop", RequestCancel: "1" }]);
    expect(canonical[0]).toMatchObject({ cancellationStatus: "approved", requestCancel: "1" });
    expect(rejected[0]).toMatchObject({ cancellationStatus: "rejected", requestCancel: "1" });
    expect(legacy[0]).toMatchObject({ cancellationStatus: "none", requestCancel: "1" });
    expect(customerCancellationLabel("requested", true, translations)).toBe("Cancellation requested");
    expect(customerCancellationLabel("approved", true, translations)).toBe("Cancellation approved");
    expect(customerCancellationLabel("rejected", true, translations)).toBe("Cancellation rejected");
  });

  it("retains canonical orders.php writes and the staging payment isolation guard", () => {
    const writes = source("src/lib/companyOrders.ts");
    const payment = source("src/lib/paymentGateway.ts");
    expect(writes).toContain("/orders.php?id=");
    expect(writes).not.toMatch(/owner-orders\.php.*(?:PATCH|DELETE)/s);
    expect(payment).toContain("PaymentUnavailableError");
  });
});
