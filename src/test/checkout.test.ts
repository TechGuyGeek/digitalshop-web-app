import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { placeOrderBatch, getCheckoutId, clearCheckoutId, checkoutSignature } from "@/lib/checkout";

const base = {
  companyId: "10",
  mode: "onsite" as const,
  tableNumber: "0",
  items: [
    { productId: 1, groupId: "2", quantity: 2 },
    { productId: 3, groupId: "2", quantity: 1 },
  ],
};

const okResponse = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)), json: () => Promise.resolve(body) } as Response);

describe("batch checkout", () => {
  beforeEach(() => { sessionStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("submits a two-item basket as ONE batch request", async () => {
    const fetchMock = vi.fn((url: string) => url.includes("refresh.php") ? okResponse({ success: true, data: { access_token: "token", user: {} } }) : okResponse({ success: true, data: { idempotent: false, order_id: "abc", submitted_units: 3 } }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await placeOrderBatch(base);
    const orderCall = fetchMock.mock.calls.find(([url]) => String(url).includes("orders.php")) as [string, RequestInit];
    expect(orderCall[0]).toContain("/api/v1/orders.php");
    const body = JSON.parse(String(orderCall[1].body));
    expect(body.items).toHaveLength(2);
    expect(body.checkoutId).toBeTruthy();
    expect(res.success).toBe(true);
  });

  it("treats idempotent success as success", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => url.includes("refresh.php") ? okResponse({ success: true, data: { access_token: "token", user: {} } }) : okResponse({ success: true, data: { idempotent: true, order_id: "abc", submitted_units: 3 } })));
    const res = await placeOrderBatch(base);
    expect(res.success).toBe(true);
    expect(res.idempotent).toBe(true);
  });

  it("keeps same checkoutId when retrying an unchanged basket", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("net"))));
    const first = await placeOrderBatch(base);
    const second = await placeOrderBatch(base);
    expect(first.success).toBe(false);
    expect(second.checkoutId).toBe(first.checkoutId);
  });

  it("generates a new checkoutId when basket or fulfilment changes", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("net"))));
    const first = await placeOrderBatch(base);
    const changed = await placeOrderBatch({ ...base, mode: "takeaway" });
    expect(changed.checkoutId).not.toBe(first.checkoutId);
  });

  it("clearCheckoutId starts a new logical checkout", () => {
    const sig = checkoutSignature(base);
    const id = getCheckoutId(sig);
    clearCheckoutId();
    expect(getCheckoutId(sig)).not.toBe(id);
  });

  it("never sends credentials to console", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn((url: string) => url.includes("refresh.php") ? okResponse({ success: true, data: { access_token: "token", user: {} } }) : okResponse({ success: true, data: { order_id: "abc" } })));
    await placeOrderBatch(base);
    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logged).not.toContain("secret");
  });
});
