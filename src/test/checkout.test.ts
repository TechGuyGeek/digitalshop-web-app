import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { clearInMemoryAccessToken } from "@/lib/authClient";
import { placeOrderBatch, checkoutSignature } from "@/lib/checkout";
import { canAddToBasket, type BasketItem } from "@/contexts/BasketContext";

const base = {
  companyId: "10",
  mode: "onsite" as const,
  tableNumber: "0",
  items: [
    { productId: 1, groupId: "2", quantity: 2 },
    { productId: 3, groupId: "2", quantity: 1 },
  ],
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("customer checkout", () => {
  beforeEach(() => { clearInMemoryAccessToken(); sessionStorage.clear(); vi.restoreAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("submits the canonical orders.php contract without legacy identity or password", async () => {
    const user = { id: 42, email: "person@example.test" };
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => url.includes("refresh.php")
      ? Promise.resolve(response({ success: true, data: { token_type: "Bearer", access_token: "token", access_expires_at: "2099-01-01T00:00:00Z", refresh_via_cookie: true, user } }))
      : url.includes("auth/me.php")
        ? Promise.resolve(response({ success: true, data: { user } }))
        : Promise.resolve(response({ success: true, data: { order_id: "0123456789abcdef", submitted_units: 3 } }, 201)));
    vi.stubGlobal("fetch", fetchMock);
    const res = await placeOrderBatch(base);
    const orderCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/orders.php")) as unknown as [string, RequestInit];
    expect(orderCall[0]).toContain("/api/v1/orders.php");
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("customer-orders.php"))).toBe(false);
    const body = JSON.parse(String(orderCall[1].body));
    expect(body).toMatchObject({ company_id: 10, mode: "onsite", table_number: "0", items: [{ product_id: 1, group_id: 2, quantity: 2 }, { product_id: 3, group_id: 2, quantity: 1 }] });
    expect(body.idempotency_key).toMatch(/^web_[A-Za-z0-9]{32}$/);
    expect(JSON.stringify(body)).not.toMatch(/PersonID|UserID|customer_id|password/i);
    expect(res.success).toBe(true);
    expect(res.checkoutId).toBe("0123456789abcdef");
  });

  it("prevents concurrent duplicate client requests", async () => {
    const user = { id: 42, email: "person@example.test" };
    const fetchMock = vi.fn((url: string) => url.includes("refresh.php")
      ? Promise.resolve(response({ success: true, data: { token_type: "Bearer", access_token: "token", access_expires_at: "2099-01-01T00:00:00Z", refresh_via_cookie: true, user } }))
      : url.includes("auth/me.php")
        ? Promise.resolve(response({ success: true, data: { user } }))
        : Promise.resolve(response({ success: true, data: { order_id: "0123456789abcdef" } }, 201)));
    vi.stubGlobal("fetch", fetchMock);
    const first = placeOrderBatch(base);
    const second = placeOrderBatch(base);
    const results = await Promise.all([first, second]);
    expect(results[0]).toEqual(results[1]);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/orders.php"))).toHaveLength(1);
  });

  it("reuses the canonical idempotency key after an interrupted checkout response", async () => {
    const user = { id: 42, email: "person@example.test" };
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => url.includes("refresh.php")
      ? Promise.resolve(response({ success: true, data: { token_type: "Bearer", access_token: "token", access_expires_at: "2099-01-01T00:00:00Z", refresh_via_cookie: true, user } }))
      : url.includes("auth/me.php")
        ? Promise.resolve(response({ success: true, data: { user } }))
        : Promise.resolve(response({ success: false, error: { code: "network_interrupted", message: "Try again" } }, 503)));
    vi.stubGlobal("fetch", fetchMock);
    await placeOrderBatch(base);
    const first = JSON.parse(String(fetchMock.mock.calls.find(([url]) => String(url).includes("/orders.php"))?.[1].body));
    fetchMock.mockImplementation((url: string, _init?: RequestInit) => Promise.resolve(response({ success: true, data: { order_id: "0123456789abcdef", idempotent: true } }, 201)));
    await placeOrderBatch(base);
    const canonicalCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/orders.php"));
    const second = JSON.parse(String(canonicalCalls.at(-1)?.[1].body));
    expect(second.idempotency_key).toBe(first.idempotency_key);
  });

  it("keeps single-shop and fulfilment fields in the local signature", () => {
    expect(checkoutSignature(base)).toContain("10#onsite#0");
    expect(checkoutSignature({ ...base, companyId: "11" })).not.toBe(checkoutSignature(base));
    const item = { id: 1, name: "Tea", price: 2, description: "", image: "", quantity: 1, companyId: "10" } satisfies BasketItem;
    expect(canAddToBasket([item], "10")).toBe(true);
    expect(canAddToBasket([item], "11")).toBe(false);
  });
});
