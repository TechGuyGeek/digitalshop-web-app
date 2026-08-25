import { deleteV1, getV1, patchV1 } from "@/lib/v1Api";

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
  OrderName?: string;
  OrderDesription?: string;
  product_imagepath?: string;
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
  items: CompanyOrderItem[];
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

function ownerOrderMutationBody(bucket: CompanyOrderBucket, order: CompanyGroupedOrder): Record<string, unknown> {
  return {
    bucket,
    company_id: Number(order.companyId),
    order_id: order.orderId,
  };
}

export async function toggleCompanyOrderFlag(
  bucket: CompanyOrderBucket,
  flag: "HasPaid" | "HasDelivered",
  newValue: string,
  order: CompanyGroupedOrder,
): Promise<void> {
  await patchV1("/owner-orders.php", {
    ...ownerOrderMutationBody(bucket, order),
    field: flag,
    value: newValue === "1",
  });
}

export async function updateCompanyOrderCancellation(
  bucket: CompanyOrderBucket,
  order: CompanyGroupedOrder,
  status: "approved" | "rejected",
): Promise<void> {
  await patchV1("/owner-orders.php", {
    ...ownerOrderMutationBody(bucket, order),
    cancellation_status: status,
  });
}

export async function deleteCompanyOrder(bucket: CompanyOrderBucket, order: CompanyGroupedOrder): Promise<void> {
  await deleteV1("/owner-orders.php", {
    ...ownerOrderMutationBody(bucket, order),
    client_id: order.clientId,
  });
}

function fallbackIdentity(row: CompanyOrderItem): string {
  return [row.companyid, row.clientid, row.DateandTime, row.TableNumber, row.NeedTakeaway, row.NeedDelivery]
    .map(clean).join("|");
}

/** Group only by the trusted checkout-wide reference when one exists. */
export function groupCompanyOrders(orders: CompanyOrderItem[]): CompanyGroupedOrder[] {
  const map = new Map<string, CompanyOrderItem[]>();
  for (const row of orders) {
    const reference = trustedReference(row.RandomeCode);
    const key = reference ? `reference:${reference}` : `context:${fallbackIdentity(row)}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  return [...map.entries()].map(([groupKey, items]) => {
    const first = items[0] || {};
    const status = clean(first.cancellation_status || first.CancellationStatus) || "none";
    const requested = truthyFlag(first.cancel_requested) || truthyFlag(first.RequestCancel) || status === "requested" || status === "approved";
    const total = items.reduce((sum, item) => sum + (Number(item.OrderPrice) || 0), 0);
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
      customerEmail: clean(first.customer_email),
      customerMobile: clean(first.customer_mobile),
      customerAddressLine1: clean(first.customer_address_line_1),
      customerAddressLine2: clean(first.customer_address_line_2),
      customerAddressLine3: clean(first.customer_address_line_3),
      customerAddressLine4: clean(first.customer_address_line_4),
      customerCountry: clean(first.customer_country),
      customerDeliveryNotes: clean(first.customer_delivery_notes),
      customerEmailVerified: truthyFlag(first.customer_email_verified),
      dateTime: clean(first.DateandTime),
      tableNumber: clean(first.TableNumber),
      needTakeaway: truthyFlag(first.NeedTakeaway) ? "1" : "0",
      needDelivery: truthyFlag(first.NeedDelivery) ? "1" : "0",
      hasPaid: truthyFlag(first.HasPaid) ? "1" : "0",
      hasDelivered: truthyFlag(first.HasDelivered) ? "1" : "0",
      requestCancel: requested ? "1" : "0",
      cancellationStatus: status,
      totalItems: items.length,
      totalPrice: total.toFixed(2),
      items,
    };
  }).sort((left, right) => right.dateTime.localeCompare(left.dateTime));
}
