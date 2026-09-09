import { deleteV1, getV1, patchV1, V1ApiError } from "@/lib/v1Api";

export type CompanyOrderBucket = "today" | "week" | "month";

export interface CompanyOrderItem {
  GroupID?: number | string;
  companyid?: number | string;
  clientid?: number | string;
  orderid?: number | string;
  Productid?: number | string;
  Name?: string;
  Surname?: string;
  customer_imagepath?: string;
  customer_email?: string;
  customer_mobile?: string;
  customer_address_line_1?: string;
  customer_address_line_2?: string;
  customer_address_line_3?: string;
  customer_address_line_4?: string;
  customer_country?: string;
  customer_delivery_notes?: string;
  customer_email_verified?: boolean | number | string;
  DateandTime?: string;
  TableNumber?: string;
  HasPaid?: string | number | boolean;
  HasDelivered?: string | number | boolean;
  NeedDelivery?: string | number | boolean;
  NeedTakeaway?: string | number | boolean;
  RequestCancel?: string | number | boolean;
  cancel_requested?: string | number | boolean;
  cancellation_status?: string;
  CancellationStatus?: string;
  RandomeCode?: string;
  OrderPrice?: string | number;
  quantity?: string | number;
  Quantity?: string | number;
  OrderQuantity?: string | number;
  product_quantity?: string | number;
  line_total?: string | number;
  LineTotal?: string | number;
  OrderName?: string;
  OrderDesription?: string;
  product_imagepath?: string;
  imagepath?: string;
  ImageSize?: string | number;
  [key: string]: unknown;
}

export interface CompanyGroupedOrder {
  groupKey: string;
  reference: string;
  companyId: string;
  clientId: string;
  orderId: string;
  customerName: string;
  customerImagePath: string;
  customerPhoto: string;
  customerEmail: string;
  customerMobile: string;
  customerAddressLine1: string;
  customerAddressLine2: string;
  customerAddressLine3: string;
  customerAddressLine4: string;
  customerCountry: string;
  customerDeliveryNotes: string;
  customerEmailVerified: boolean;
  dateTime: string;
  tableNumber: string;
  needTakeaway: string;
  needDelivery: string;
  hasPaid: string;
  hasDelivered: string;
  requestCancel: string;
  cancellationStatus: string;
  totalItems: number;
  totalPrice: string;
  hasCanonicalReference: boolean;
  items: CompanyOrderItem[];
}

export interface OwnerOrderStatistics {
  orders: number;
  products: number;
}

const clean = (value: unknown): string => String(value ?? "").trim();

function trustedReference(value: unknown): string {
  const reference = clean(value);
  return reference.length >= 16 && reference.length <= 64
    && /^[A-Za-z0-9_-]+$/.test(reference)
    && !["0", "null", "undefined"].includes(reference.toLowerCase()) ? reference : "";
}

export function isTrustedCompanyOrderReference(value: unknown): boolean {
  return trustedReference(value) !== "";
}

function truthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function ownerOrdersPath(bucket: CompanyOrderBucket, companyId: string, detail?: { clientId: string; dateTime: string }): string {
  const query = new URLSearchParams({
    action: detail ? "details" : "orders",
    bucket,
    company_id: companyId,
  });
  if (detail) {
    query.set("client_id", detail.clientId);
    query.set("date_time", detail.dateTime);
  }
  return `/owner-orders.php?${query.toString()}`;
}

export function fetchCompanyOrdersByTab(companyId: string, bucket: CompanyOrderBucket): Promise<CompanyOrderItem[]> {
  return getV1<CompanyOrderItem[]>(ownerOrdersPath(bucket, companyId));
}

export function fetchCompanyOrderDetail(
  bucket: CompanyOrderBucket,
  companyId: string,
  clientId: string,
  dateTime: string,
): Promise<CompanyOrderItem[]> {
  return getV1<CompanyOrderItem[]>(ownerOrdersPath(bucket, companyId, { clientId, dateTime }));
}

function canonicalOrderPath(order: CompanyGroupedOrder): string {
  const reference = trustedReference(order.reference);
  if (!reference) throw new V1ApiError(422, { code: "invalid_order_reference", message: "This order cannot be changed." });
  return `/orders.php?id=${encodeURIComponent(reference)}`;
}

export async function toggleCompanyOrderFlag(
  bucket: CompanyOrderBucket,
  flag: "HasPaid" | "HasDelivered",
  newValue: string,
  order: CompanyGroupedOrder,
): Promise<void> {
  void bucket;
  await patchV1(canonicalOrderPath(order), flag === "HasPaid"
    ? { paid: newValue === "1" }
    : { delivered: newValue === "1" });
}

export async function updateCompanyOrderCancellation(
  bucket: CompanyOrderBucket,
  order: CompanyGroupedOrder,
  status: "approved" | "rejected",
): Promise<void> {
  void bucket;
  await patchV1(canonicalOrderPath(order), { cancellation_status: status });
}

export async function deleteCompanyOrder(bucket: CompanyOrderBucket, order: CompanyGroupedOrder): Promise<void> {
  void bucket;
  await deleteV1(canonicalOrderPath(order), {});
}

function fallbackIdentity(row: CompanyOrderItem): string {
  return [row.companyid, row.clientid, row.DateandTime, row.TableNumber, row.NeedTakeaway, row.NeedDelivery]
    .map(clean).join("|");
}

function legacyOrderId(value: unknown): string {
  const result = clean(value);
  return result && !["0", "null", "undefined"].includes(result.toLowerCase()) ? result : "";
}

function orderIdentity(row: CompanyOrderItem): string {
  const reference = trustedReference(row.RandomeCode);
  if (reference) return `reference:${reference}`;
  const orderId = legacyOrderId(row.orderid);
  if (orderId) return `order:${orderId}`;
  return `context:${fallbackIdentity(row)}`;
}

function quantityFor(row: CompanyOrderItem): number {
  const value = Number(row.quantity ?? row.Quantity ?? row.OrderQuantity ?? row.product_quantity);
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function lineTotalFor(row: CompanyOrderItem): number {
  const explicit = Number(row.line_total ?? row.LineTotal);
  if (Number.isFinite(explicit)) return explicit;
  const price = Number(row.OrderPrice);
  return Number.isFinite(price) ? price * quantityFor(row) : 0;
}

const OWNER_ORDER_CONTACT_FIELDS = new Set([
  "customer_email", "customer_mobile", "customer_address_line_1",
  "customer_address_line_2", "customer_address_line_3", "customer_address_line_4",
  "customer_country", "customer_delivery_notes", "PersonID", "person_id", "UserID", "user_id",
]);

/** Keep legacy order rows usable without making them a contact-data source. */
export function withoutOwnerCustomerContact(item: CompanyOrderItem): CompanyOrderItem {
  return Object.fromEntries(Object.entries(item).filter(([key]) => !OWNER_ORDER_CONTACT_FIELDS.has(key))) as CompanyOrderItem;
}

/** Group only by the trusted checkout-wide reference when one exists. */
export function groupCompanyOrders(orders: CompanyOrderItem[]): CompanyGroupedOrder[] {
  const map = new Map<string, CompanyOrderItem[]>();
  for (const row of orders) {
    const key = orderIdentity(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  return [...map.entries()].map(([groupKey, items]) => {
    const first = items[0] || {};
    const normalizedItems = items.map((item) => ({
      // Owner order rows may contain legacy contact columns. Do not carry
      // those values into the Web order model; contact access is exclusively
      // through company-customer-profile.php?order_id=...
      ...withoutOwnerCustomerContact(item),
      product_imagepath: clean(item.product_imagepath || item.imagepath),
    }));
    const statuses = items.map((item) => clean(item.cancellation_status || item.CancellationStatus).toLowerCase());
    const status = ["approved", "rejected", "requested"].find((candidate) => statuses.includes(candidate)) || "none";
    const requested = items.some((item) => truthyFlag(item.cancel_requested) || truthyFlag(item.RequestCancel))
      || ["requested", "approved", "rejected"].includes(status);
    const total = items.reduce((sum, item) => sum + lineTotalFor(item), 0);
    const customerName = [clean(first.Name), clean(first.Surname)].filter(Boolean).join(" ") || "Customer";
    const customerImagePath = clean(first.customer_imagepath);

    return {
      groupKey,
      reference: trustedReference(first.RandomeCode),
      companyId: clean(first.companyid),
      clientId: clean(first.clientid),
      orderId: clean(first.orderid),
      customerName,
      customerImagePath,
      customerPhoto: customerImagePath,
      // Keep the legacy shape for callers while deliberately leaving contact
      // fields empty. The authorized customer projection is the only source
      // for owner-to-customer contact details.
      customerEmail: "",
      customerMobile: "",
      customerAddressLine1: "",
      customerAddressLine2: "",
      customerAddressLine3: "",
      customerAddressLine4: "",
      customerCountry: "",
      customerDeliveryNotes: "",
      customerEmailVerified: truthyFlag(first.customer_email_verified),
      dateTime: clean(first.DateandTime),
      tableNumber: clean(first.TableNumber),
      needTakeaway: truthyFlag(first.NeedTakeaway) ? "1" : "0",
      needDelivery: truthyFlag(first.NeedDelivery) ? "1" : "0",
      hasPaid: truthyFlag(first.HasPaid) ? "1" : "0",
      hasDelivered: truthyFlag(first.HasDelivered) ? "1" : "0",
      requestCancel: requested ? "1" : "0",
      cancellationStatus: status,
      totalItems: items.reduce((sum, item) => sum + quantityFor(item), 0),
      totalPrice: total.toFixed(2),
      hasCanonicalReference: trustedReference(first.RandomeCode) !== "",
      items: normalizedItems,
    };
  }).sort((left, right) => right.dateTime.localeCompare(left.dateTime));
}

export async function fetchOwnerStatistics(companyId: string): Promise<Record<CompanyOrderBucket, OwnerOrderStatistics>> {
  const entries = await Promise.all((['today', 'week', 'month'] as CompanyOrderBucket[]).map(async (bucket) => {
    const groups = groupCompanyOrders(await fetchCompanyOrdersByTab(companyId, bucket));
    return [bucket, { orders: groups.length, products: groups.reduce((sum, order) => sum + order.totalItems, 0) }] as const;
  }));
  return Object.fromEntries(entries) as Record<CompanyOrderBucket, OwnerOrderStatistics>;
}
