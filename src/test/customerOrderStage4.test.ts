import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearInMemoryAccessToken, login, API_ORIGIN } from "@/lib/authClient";
import {
  fetchCustomerOrderDetail, fetchOrdersToday, fetchOrdersWeek, fetchOrdersMonth, formatOrderDateTime, groupOrdersBySession,
  isTrustedOrderReference, orderTimestamp, requestCancelOrder,
} from "@/lib/orderHistory";
import { buildMenuImageUrl, createV1OrderQr } from "@/lib/v1Api";
import { buildContactLinks } from "@/lib/companyContact";

const user = { id: 42, email: "customer@example.test", first_name: "Customer", last_name: "Test" };
const envelope = (data: unknown, status = 200) => new Response(JSON.stringify({ success: true, data }), { status, headers: { "Content-Type": "application/json" } });

async function authenticate(fetchMock: ReturnType<typeof vi.spyOn>) {
  fetchMock.mockResolvedValueOnce(envelope({ token_type: "Bearer", access_token: "access", access_expires_at: "2099-01-01T00:00:00Z", refresh_via_cookie: true, user }));
  fetchMock.mockResolvedValueOnce(envelope({ user }));
  await login(user.email, "not-retained");
}

describe("Web Stage 4 customer order flow", () => {
  beforeEach(() => { clearInMemoryAccessToken(); vi.restoreAllMocks(); });

  it("groups only by trusted checkout reference and carries order-context contact data", () => {
    const rows = [
      { companyid: "82", clientid: "42", orderid: "1001", RandomeCode: "0123456789abcdef0123456789abcdef", DateandTime: "2026-08-24 12:00:00", companyname: "Shop", company_imagepath: "/Images/shop.jpg", mobile_number: "07123456789", company_email: "shop@example.test", line_one_address: "1 High Street", country: "UK", OrderName: "Tea", OrderPrice: "2.50" },
      { companyid: "82", clientid: "42", orderid: "1002", RandomeCode: "0123456789abcdef0123456789abcdef", DateandTime: "2026-08-24 12:00:00", companyname: "Shop", OrderName: "Cake", OrderPrice: "3.00" },
      { companyid: "82", clientid: "42", orderid: "1003", RandomeCode: "different-reference", DateandTime: "2026-08-24 11:00:00" },
    ];
    const groups = groupOrdersBySession(rows);
    expect(groups[0].itemCount).toBe(2);
    expect(groups[0].reference).toBe("0123456789abcdef0123456789abcdef");
    expect(groups[0].orderId).toBe("1001");
    expect(groups[0].mobileNumber).toBe("07123456789");
    expect(groups[0].companyEmail).toBe("shop@example.test");
    expect(groups).toHaveLength(2);
    expect(isTrustedOrderReference("1001")).toBe(false);
  });

  it("uses canonical Today and detail URLs with no identity authority", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await authenticate(fetchMock);
    fetchMock.mockResolvedValueOnce(envelope([]));
    await fetchOrdersToday();
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe(`${API_ORIGIN}/menu1/api/v1/customer-orders.php?bucket=today`);
    expect(JSON.stringify(fetchMock.mock.calls.at(-1)?.[1])).not.toMatch(/PersonID|UserID|password/i);

    fetchMock.mockResolvedValueOnce(envelope([]));
    await fetchCustomerOrderDetail("week", "82", "999", "2026-08-24 12:00:00");
    const detailUrl = String(fetchMock.mock.calls.at(-1)?.[0]);
    expect(detailUrl).toContain("/customer-orders.php?action=details");
    expect(detailUrl).toContain("bucket=week");
    expect(detailUrl).toContain("company_id=82");
    expect(detailUrl).toContain("date_time=2026-08-24+12%3A00%3A00");
    fetchMock.mockResolvedValueOnce(envelope([]));
    await fetchOrdersWeek();
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("customer-orders.php?bucket=week");
    fetchMock.mockResolvedValueOnce(envelope([]));
    await fetchOrdersMonth();
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("customer-orders.php?bucket=month");
  });

  it("uses the canonical PATCH cancellation contract and refreshable detail", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await authenticate(fetchMock);
    fetchMock.mockResolvedValueOnce(envelope({ cancel_requested: true }));
    await requestCancelOrder({ companyId: "82", orderId: "1001" } as never, "month");
    const init = fetchMock.mock.calls.at(-1)?.[1] as RequestInit;
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ bucket: "month", company_id: 82, order_id: "1001" });
  });

  it("uses the checkout-wide reference for order QR without credential material", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await authenticate(fetchMock);
    fetchMock.mockResolvedValueOnce(envelope({ token: "qr-token", order_id: "0123456789abcdef" }));
    await createV1OrderQr("0123456789abcdef");
    const call = fetchMock.mock.calls.at(-1)!;
    expect(String(call[0])).toContain("/order-payment-qr.php");
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({ order_id: "0123456789abcdef" });
    expect(String((call[1] as RequestInit).body)).not.toMatch(/bearer|refresh|customer|company|password/i);
  });

  it("converts UTC SQL time to local DST/GMT/alternate zones and handles offsets/fallbacks", () => {
    expect(orderTimestamp("2026-08-24 12:00:00")).toBe(Date.parse("2026-08-24T12:00:00Z"));
    expect(formatOrderDateTime("2026-08-24 12:00:00", "Europe/London")).toContain("13:00");
    expect(formatOrderDateTime("2026-01-24 12:00:00", "Europe/London")).toContain("12:00");
    expect(formatOrderDateTime("2026-08-24 12:00:00", "America/New_York")).toContain("08:00");
    expect(orderTimestamp("2026-08-24T13:00:00+01:00")).toBe(Date.parse("2026-08-24T12:00:00Z"));
    expect(formatOrderDateTime("not-a-time")).toBe("not-a-time");
    expect(formatOrderDateTime("")).toBe("—");
  });

  it("uses the menu-image proxy and safe contact actions", () => {
    const image = buildMenuImageUrl("/Images/company/shop.jpg");
    expect(image).toContain("/menu1/api/v1/menu-image.php?path=");
    expect(image).not.toContain("/menu1/Images/");
    expect(buildContactLinks("07123 456789", "shop@example.test")).toEqual({ phone: "tel:07123 456789", sms: "sms:07123 456789", whatsapp: "https://wa.me/447123456789", email: "mailto:shop@example.test" });
    expect(buildContactLinks("", "")).toEqual({ phone: "", sms: "", whatsapp: "", email: "" });
  });

  it("rejects the historical stage hostname typo", () => {
    expect(API_ORIGIN).toBe("https://web.gpsshops.com");
    expect(API_ORIGIN).not.toContain("gpshops.com");
  });
});
