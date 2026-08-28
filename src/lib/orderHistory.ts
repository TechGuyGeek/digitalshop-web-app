import { buildMenuImageUrl, getV1, postV1, V1ApiError, isSessionError } from "@/lib/v1Api";

export type OrderBucket = "today" | "week" | "month";

export interface CustomerOrderContact {
  companyName: string;
  companyImagePath: string;
  mobileNumber: string;
  companyEmail: string;
  lineOneAddress: string;
  lineTwoAddress: string;
  lineThreeAddress: string;
  lineFourAddress: string;
  country: string;
  description: string;
}

export interface OrderSummary {
  clientid?: string;
  Companyid?: string;
  companyid?: string;
  orderid?: string;
  Orderid?: string;
  CompanyName?: string;
  companyname?: string;
  companyphoto?: string;
  company_imagepath?: string;
  CompanyDescription?: string;
  DateandTime?: string;
  TotalItems?: string | number;
  TotalPrice?: string | number;
  TableNumber?: string;
  NeedTakeaway?: string;
  NeedDelivery?: string;
  HasPaid?: string;
  HasDelivered?: string;
  PaymentStatus?: string;
  DeliveryStatus?: string;
  RequestCancel?: string;
  cancel_requested?: string | number | boolean;
  cancellation_status?: string;
  CancellationStatus?: string;
  RandomeCode?: string;
  GroupID?: string;
  productid?: string;
  Productid?: string;
  OrderName?: string;
  OrderPrice?: string | number;
  OrderDesription?: string;
  product_imagepath?: string;
  ImageSize?: string | number;
  mobile_number?: string;
  company_email?: string;
  line_one_address?: string;
  line_two_address?: string;
  line_three_address?: string;
  line_four_address?: string;
  country?: string;
  [key: string]: unknown;
}

export interface GroupedOrder extends CustomerOrderContact {
  randomCode: string;
  reference: string;
  orderId: string;
  clientId: string;
  companyId: string;
  dateTime: string;
  tableNumber: string;
  needTakeaway: string;
  needDelivery: string;
  hasPaid: string;
  hasDelivered: string;
  requestCancel: string;
  cancellationStatus: string;
  itemCount: number;
  items: OrderSummary[];
}

const clean = (value: unknown): string => String(value ?? "").trim();

function trustedReference(value: unknown): string {
  const reference = clean(value);
  return reference.length >= 16 && reference.length <= 64
    && /^[A-Za-z0-9_-]+$/.test(reference)
    && !["0", "null", "undefined"].includes(reference.toLowerCase()) ? reference : "";
}

export function isTrustedOrderReference(value: unknown): boolean { return trustedReference(value) !== ""; }

function truthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function customerCancellationLabel(status: string, requested: boolean, t: (key: string) => string): string {
  if (status === "approved") return t("CancellationApproved");
  if (status === "rejected") return t("CancellationRejected");
  if (status === "requested" || requested) return t("CancellationRequested");
  return "";
}

export function fetchOrdersToday(): Promise<OrderSummary[]> { return getV1<OrderSummary[]>("/customer-orders.php?bucket=today"); }
export function fetchOrdersWeek(): Promise<OrderSummary[]> { return getV1<OrderSummary[]>("/customer-orders.php?bucket=week"); }
export function fetchOrdersMonth(): Promise<OrderSummary[]> { return getV1<OrderSummary[]>("/customer-orders.php?bucket=month"); }

export function fetchCustomerOrderDetail(bucket: OrderBucket, companyId: string, clientId: string, dateTime: string): Promise<OrderSummary[]> {
  const query = new URLSearchParams({ action: "details", bucket, company_id: companyId, client_id: clientId, date_time: dateTime });
  return getV1<OrderSummary[]>(`/customer-orders.php?${query.toString()}`);
}

export async function requestCancelOrder(order: GroupedOrder, bucket: OrderBucket): Promise<void> {
  void bucket;
  const reference = trustedReference(order.reference);
  if (!reference) throw new V1ApiError(422, { code: "invalid_order_reference", message: "This order cannot be cancelled." });
  await postV1(`/orders.php?id=${encodeURIComponent(reference)}&action=cancel`, {});
}

function fallbackIdentity(row: OrderSummary): string {
  return [row.companyid || row.Companyid, row.clientid, row.DateandTime, row.TableNumber, row.NeedTakeaway, row.NeedDelivery]
    .map(clean).join("|");
}

function contactFromRows(rows: OrderSummary[]): CustomerOrderContact {
  const row = rows.find((candidate) => clean(candidate.companyname || candidate.CompanyName)) || rows[0] || {};
  return {
    companyName: clean(row.companyname || row.CompanyName) || "Shop",
    companyImagePath: clean(row.company_imagepath || row.companyphoto),
    mobileNumber: clean(row.mobile_number),
    companyEmail: clean(row.company_email),
    lineOneAddress: clean(row.line_one_address),
    lineTwoAddress: clean(row.line_two_address),
    lineThreeAddress: clean(row.line_three_address),
    lineFourAddress: clean(row.line_four_address),
    country: clean(row.country),
    description: clean(row.CompanyDescription),
  };
}

/** Group by the trusted checkout-wide reference, never by numeric line orderid. */
export function groupOrdersBySession(orders: OrderSummary[]): GroupedOrder[] {
  const map = new Map<string, OrderSummary[]>();
  for (const row of orders) {
    const reference = trustedReference(row.RandomeCode);
    const key = reference ? `reference:${reference}` : `context:${fallbackIdentity(row)}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return [...map.entries()].map(([key, items]) => {
    const first = items[0];
    const statuses = items.map((item) => clean(item.cancellation_status || item.CancellationStatus).toLowerCase());
    const cancellationStatus = ["approved", "rejected", "requested"].find((status) => statuses.includes(status)) || "none";
    const requestCancel = items.some((item) => truthyFlag(item.cancel_requested) || truthyFlag(item.RequestCancel))
      || ["requested", "approved", "rejected"].includes(cancellationStatus);
    return {
      ...contactFromRows(items),
      randomCode: key,
      reference: trustedReference(first.RandomeCode),
      orderId: clean(first.orderid || first.Orderid),
      clientId: clean(first.clientid),
      companyId: clean(first.companyid || first.Companyid),
      dateTime: clean(first.DateandTime),
      tableNumber: clean(first.TableNumber),
      needTakeaway: clean(first.NeedTakeaway) || "0",
      needDelivery: clean(first.NeedDelivery) || "0",
      hasPaid: clean(first.HasPaid) || "0",
      hasDelivered: clean(first.HasDelivered) || "0",
      requestCancel: requestCancel ? "1" : "0",
      cancellationStatus,
      itemCount: items.length,
      items,
    };
  }).sort((left, right) => orderTimestamp(right.dateTime) - orderTimestamp(left.dateTime));
}

/**
 * Convert the backend's timestamp deliberately instead of relying on the
 * browser's interpretation of a timezone-less SQL DATETIME.
 *
 * customer-orders.php returns the value written by PHP date('Y-m-d H:i:s').
 * The deployed PHP runtime is UTC, so a timezone-less SQL value is UTC. An
 * ISO value carrying Z or an explicit offset is already absolute and must not
 * be converted a second time.
 */
export function orderTimestamp(raw: string): number {
  const value = clean(raw);
  if (!value) return 0;

  const explicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  if (explicitZone) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  const sql = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?$/u.exec(value);
  if (!sql) return 0;
  const [, year, month, day, hour, minute, second, fraction = ""] = sql;
  const milliseconds = Number(fraction.padEnd(3, "0").slice(0, 3));
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), milliseconds);
  const check = new Date(timestamp);
  if (check.getUTCFullYear() !== Number(year) || check.getUTCMonth() !== Number(month) - 1 || check.getUTCDate() !== Number(day)
    || check.getUTCHours() !== Number(hour) || check.getUTCMinutes() !== Number(minute) || check.getUTCSeconds() !== Number(second)) return 0;
  return timestamp;
}

export function formatOrderDateTime(raw: string, timeZone?: string): string {
  const timestamp = orderTimestamp(raw);
  if (!timestamp) return clean(raw) || "—";
  const options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
  if (timeZone) options.timeZone = timeZone;
  return new Intl.DateTimeFormat(timeZone ? "en-GB" : undefined, options).format(timestamp);
}

export function getCompanyPhotoUrl(photo: string | undefined): string { return buildMenuImageUrl(photo); }
export function getProductPhotoUrl(photo: string | undefined): string { return buildMenuImageUrl(photo); }

export { V1ApiError, isSessionError };
