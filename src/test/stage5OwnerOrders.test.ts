import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearInMemoryAccessToken, login } from "@/lib/authClient";
import {
  deleteCompanyOrder, fetchCompanyOrderDetail, fetchCompanyOrdersByTab, groupCompanyOrders,
  fetchOwnerStatistics, toggleCompanyOrderFlag, updateCompanyOrderCancellation, type CompanyGroupedOrder,
} from "@/lib/companyOrders";
import { customerOrderImageUrl } from "@/lib/customerOrderImage";
import { formatOrderDateTime, getProductPhotoUrl } from "@/lib/orderHistory";

const user = { id: 42, email: "owner@example.test", first_name: "Owner", last_name: "Test" };
const envelope = (data: unknown, status = 200) => new Response(JSON.stringify({ success: true, data }), { status, headers: { "Content-Type": "application/json" } });

async function authenticate(fetchMock: ReturnType<typeof vi.spyOn>) {
  fetchMock.mockResolvedValueOnce(envelope({ token_type: "Bearer", access_token: "access", access_expires_at: "2099-01-01T00:00:00Z", refresh_via_cookie: true, user }));
  fetchMock.mockResolvedValueOnce(envelope({ user }));
  await login(user.email, "not-retained");
}

const order: CompanyGroupedOrder = {
  groupKey: "reference:0123456789abcdef0123456789abcdef",
  reference: "0123456789abcdef0123456789abcdef",
  companyId: "82",
  clientId: "42",
  orderId: "1001",
  customerName: "Customer Test",
  customerImagePath: "/Images/UserProfile/customer.jpg",
  customerPhoto: "/Images/UserProfile/customer.jpg",
  customerEmail: "customer@example.test",
  customerMobile: "07123 456789",
  customerAddressLine1: "1 High Street",
  customerAddressLine2: "",
  customerAddressLine3: "",
  customerAddressLine4: "",
  customerCountry: "UK",
  customerDeliveryNotes: "Ring the bell",
  customerEmailVerified: true,
  dateTime: "2026-08-24 12:00:00",
  tableNumber: "4",
  needTakeaway: "0",
  needDelivery: "0",
  hasPaid: "0",
  hasDelivered: "0",
  requestCancel: "1",
  cancellationStatus: "requested",
  totalItems: 1,
  totalPrice: "5.00",
  items: [],
};

describe("Web Stage 5 canonical owner orders", () => {
  beforeEach(() => { clearInMemoryAccessToken(); vi.restoreAllMocks(); });

  it.each(["today", "week", "month"] as const)("uses owner-orders.php for %s reads", async (bucket) => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await authenticate(fetchMock);
    fetchMock.mockResolvedValueOnce(envelope([]));
    await fetchCompanyOrdersByTab("82", bucket);
    const call = fetchMock.mock.calls.at(-1)!;
    expect(String(call[0])).toContain(`/menu1/api/v1/owner-orders.php?action=orders&bucket=${bucket}&company_id=82`);
    expect(JSON.stringify(call[1])).not.toMatch(/PersonID|UserID|password|UserPassword|UserEmail/i);
  });

  it("uses canonical owner detail with client and timestamp selectors", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await authenticate(fetchMock);
    fetchMock.mockResolvedValueOnce(envelope([]));
    await fetchCompanyOrderDetail("week", "82", "42", "2026-08-24 12:00:00");
    const url = String(fetchMock.mock.calls.at(-1)?.[0]);
    expect(url).toContain("owner-orders.php?action=details");
    expect(url).toContain("bucket=week");
    expect(url).toContain("company_id=82");
    expect(url).toContain("client_id=42");
    expect(url).toContain("date_time=2026-08-24+12%3A00%3A00");
  });

  it("uses the shared local-time formatter for owner timestamps", () => {
    expect(formatOrderDateTime("2026-08-24 12:00:00", "Europe/London")).toContain("13:00");
    expect(formatOrderDateTime("2026-01-24 12:00:00", "Europe/London")).toContain("12:00");
    expect(formatOrderDateTime("2026-08-24 12:00:00", "America/New_York")).toContain("08:00");
  });

  it("groups by checkout reference and keeps order-line identity separate", () => {
    const groups = groupCompanyOrders([
      { companyid: "82", clientid: "42", orderid: "1001", RandomeCode: order.reference, DateandTime: order.dateTime, Name: "Customer", Surname: "Test", customer_imagepath: order.customerImagePath, customer_email: order.customerEmail, customer_mobile: order.customerMobile, customer_email_verified: 1, cancellation_status: "requested", OrderPrice: "2.50" },
      { companyid: "82", clientid: "42", orderid: "1002", RandomeCode: order.reference, DateandTime: order.dateTime, OrderPrice: "2.50" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ reference: order.reference, orderId: "1001", customerImagePath: order.customerImagePath, customerEmail: "", customerMobile: "", customerEmailVerified: true, cancellationStatus: "requested" });
    expect(groups[0].items[0]).not.toHaveProperty("customer_email");
    expect(groups[0].items[0]).not.toHaveProperty("customer_mobile");
  });

  it("computes unique order counts and quantity-based product counts from server buckets", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await authenticate(fetchMock);
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      const rows = url.includes("bucket=today")
        ? [
          { companyid: "82", orderid: "1001", RandomeCode: order.reference, DateandTime: order.dateTime, quantity: 2, OrderPrice: "2.50" },
          { companyid: "82", orderid: "1002", RandomeCode: order.reference, DateandTime: order.dateTime, quantity: 3, OrderPrice: "2.50" },
        ]
        : url.includes("bucket=week")
          ? [
            { companyid: "82", orderid: "2001", DateandTime: order.dateTime, quantity: 2, OrderPrice: "2.50" },
            { companyid: "82", orderid: "2001", DateandTime: order.dateTime, quantity: 1, OrderPrice: "2.50" },
          ]
          : [
            { companyid: "82", orderid: "3001", DateandTime: order.dateTime, quantity: 1, OrderPrice: "2.50" },
            { companyid: "82", orderid: "3002", DateandTime: order.dateTime, quantity: 1, OrderPrice: "2.50" },
          ];
      return Promise.resolve(envelope(rows));
    });

    await expect(fetchOwnerStatistics("82")).resolves.toEqual({
      today: { orders: 1, products: 5 },
      week: { orders: 1, products: 3 },
      month: { orders: 2, products: 2 },
    });
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/owner-orders.php?action=orders&bucket=")).length).toBe(3);
  });

  it("routes customer images through menu-image.php and safely falls back", () => {
    expect(customerOrderImageUrl(order.customerImagePath)).toContain("/menu1/api/v1/menu-image.php?path=");
    expect(customerOrderImageUrl("")).toBe("");
    expect(customerOrderImageUrl("https://untrusted.example/customer.jpg")).toBe("");
  });

  it("normalizes owner detail imagepath rows into separate product proxy images", () => {
    const [group] = groupCompanyOrders([
      { companyid: "82", clientid: "42", orderid: "1001", RandomeCode: order.reference, DateandTime: order.dateTime, customer_imagepath: order.customerImagePath, imagepath: "/Images/Menu/bedroom.jpg", OrderName: "Picture for the Bedroom", OrderPrice: "2.00" },
      { companyid: "82", clientid: "42", orderid: "1002", RandomeCode: order.reference, DateandTime: order.dateTime, customer_imagepath: order.customerImagePath, imagepath: "/Images/Menu/gold-drink.jpg", OrderName: "Gold drink", OrderPrice: "3.00" },
      { companyid: "82", clientid: "42", orderid: "1003", RandomeCode: order.reference, DateandTime: order.dateTime, customer_imagepath: order.customerImagePath, OrderName: "No artwork", OrderPrice: "1.00" },
    ]);
    expect(group.items.map((item) => item.product_imagepath)).toEqual([
      "/Images/Menu/bedroom.jpg", "/Images/Menu/gold-drink.jpg", "",
    ]);
    expect(group.items[0].product_imagepath).not.toBe(group.customerImagePath);
    expect(getProductPhotoUrl(group.items[0].product_imagepath)).toContain("/menu1/api/v1/menu-image.php?path=");
    expect(getProductPhotoUrl(group.items[2].product_imagepath)).toBe("");
    const detail = readFileSync("src/pages/CompanyOrderDetail.tsx", "utf8");
    const customer = readFileSync("src/components/CustomerOrderDetail.tsx", "utf8");
    expect(detail).toContain("getProductPhotoUrl(item.product_imagepath)");
    expect(customer).toContain("getProductPhotoUrl(String(item.product_imagepath || \"\"))");
  });

  it("uses canonical paid and delivered PATCH fields", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await authenticate(fetchMock);
    fetchMock.mockResolvedValueOnce(envelope({ updated: true }));
    await toggleCompanyOrderFlag("today", "HasPaid", "1", order);
    let call = fetchMock.mock.calls.at(-1)!;
    expect(String(call[0])).toContain(`/menu1/api/v1/orders.php?id=${order.reference}`);
    expect((call[1] as RequestInit).method).toBe("PATCH");
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({ paid: true });

    fetchMock.mockResolvedValueOnce(envelope({ updated: true }));
    await toggleCompanyOrderFlag("today", "HasDelivered", "0", order);
    call = fetchMock.mock.calls.at(-1)!;
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({ delivered: false });
  });

  it("uses canonical cancellation approve/reject PATCH and whole-checkout DELETE", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await authenticate(fetchMock);
    fetchMock.mockResolvedValueOnce(envelope({ updated: true }));
    await updateCompanyOrderCancellation("month", order, "approved");
    let call = fetchMock.mock.calls.at(-1)!;
    expect(String(call[0])).toContain(`/menu1/api/v1/orders.php?id=${order.reference}`);
    expect((call[1] as RequestInit).method).toBe("PATCH");
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({ cancellation_status: "approved" });

    fetchMock.mockResolvedValueOnce(envelope({ updated: true }));
    await updateCompanyOrderCancellation("month", order, "rejected");
    call = fetchMock.mock.calls.at(-1)!;
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({ cancellation_status: "rejected" });

    fetchMock.mockResolvedValueOnce(envelope({ deleted: true }));
    await deleteCompanyOrder("month", order);
    call = fetchMock.mock.calls.at(-1)!;
    expect(String(call[0])).toContain(`/menu1/api/v1/orders.php?id=${order.reference}`);
    expect((call[1] as RequestInit).method).toBe("DELETE");
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({});
  });

  it("surfaces terminal cancellation conflicts without fabricating a successful mutation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await authenticate(fetchMock);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: { code: "cancellation_approved", message: "Cancellation was approved." } }), { status: 409, headers: { "Content-Type": "application/json" } }));
    await expect(toggleCompanyOrderFlag("today", "HasPaid", "1", order)).rejects.toMatchObject({ status: 409, code: "cancellation_approved" });
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/orders.php"))).toHaveLength(1);
  });

  it("keeps customer payment and QR controls while owner detail has neither", () => {
    const ownerDetail = readFileSync("src/pages/CompanyOrderDetail.tsx", "utf8");
    const customerDetail = readFileSync("src/components/CustomerOrderDetail.tsx", "utf8");
    expect(ownerDetail).not.toContain("OrderPayButton");
    expect(ownerDetail).not.toContain("order-payment-qr.php");
    expect(ownerDetail).toContain("disabled={!links.sms}");
    expect(ownerDetail).toContain("disabled={!links.phone}");
    expect(ownerDetail).toContain("disabled={!links.whatsapp}");
    expect(ownerDetail).toContain("disabled={!links.email}");
    expect(customerDetail).toContain("Show Order QR");
    expect(customerDetail).toContain("createV1OrderQr");
  });

  it("reloads canonical state after cancellation and removes deleted orders from the owner view", () => {
    const ownerDetail = readFileSync("src/pages/CompanyOrderDetail.tsx", "utf8");
    const ownerList = readFileSync("src/pages/CompanyOrders.tsx", "utf8");
    expect(ownerDetail).toContain("await loadDetail()");
    expect(ownerDetail).toContain("navigate(\"/company-orders\", { replace: true");
    expect(ownerList).toContain("await loadOrders(activeTab)");
  });

  it("does not retain arbitrary customer-profile or legacy credential callers", () => {
    const orders = readFileSync("src/pages/CompanyOrders.tsx", "utf8");
    const api = readFileSync("src/lib/companyOrders.ts", "utf8");
    expect(orders).not.toContain("CustomerProfileReadonly");
    expect(orders).not.toContain("userid=");
    expect(api).not.toMatch(/RetriveLiveOrders|SavePayedorNot|SaveDELIVEREDORNOT|DeleteusersOrder2Secure|UserPassword|UserEmail/);
    expect(api).toContain('"PersonID"');
  });

  it("strips legacy owner-order customer identifiers before Web model use", () => {
    const [group] = groupCompanyOrders([{
      ...order,
      PersonID: 42,
      customer_email: "private@example.test",
      customer_mobile: "07123456789",
      customer_address_line_1: "Private address",
    }]);
    expect(group.items[0]).not.toHaveProperty("PersonID");
    expect(group.items[0]).not.toHaveProperty("customer_email");
    expect(group.items[0]).not.toHaveProperty("customer_mobile");
    expect(group.items[0]).not.toHaveProperty("customer_address_line_1");
  });
});
