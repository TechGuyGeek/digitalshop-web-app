const SERVER_DOMAIN = "https://web.gpsshops.com/";

export interface OrderSummary {
  clientid?: string;
  Companyid?: string;
  companyid?: string;
  orderid?: string;
  Orderid?: string;
  CompanyName?: string;
  companyname?: string;
  companyphoto?: string;
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
  RandomeCode?: string;
  GroupID?: string;
  productid?: string;
  [key: string]: unknown;
}

/** A grouped order representing one checkout session */
export interface GroupedOrder {
  randomCode: string;
  companyId: string;
  companyName: string;
  companyphoto: string;
  dateTime: string;
  tableNumber: string;
  needTakeaway: string;
  needDelivery: string;
  hasPaid: string;
  hasDelivered: string;
  requestCancel: string;
  itemCount: number;
  items: OrderSummary[];
}

export async function fetchOrdersToday(personId: string): Promise<OrderSummary[]> {
  return fetchOrders("menu1/PHPread/CompanyLiveUserOrders/RetriveLiveUserOrders.php", personId);
}

export async function fetchOrdersWeek(personId: string): Promise<OrderSummary[]> {
  return fetchOrders("menu1/PHPread/CompanyLiveUserOrders/RetriveLiveUserOrdersweek.php", personId);
}

export async function fetchOrdersMonth(personId: string): Promise<OrderSummary[]> {
  return fetchOrders("menu1/PHPread/CompanyLiveUserOrders/RetriveLiveUserOrdersmonth.php", personId);
}

async function fetchOrders(endpoint: string, personId: string): Promise<OrderSummary[]> {
  try {
    const formData = new URLSearchParams();
    formData.append("PersonID", personId);

    const response = await fetch(SERVER_DOMAIN + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const text = await response.text();
    if (!text || text.trim() === "" || text.trim() === "[]") return [];

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed as OrderSummary[];
  } catch (err) {
    console.error("fetchOrders error:", endpoint, err);
    return [];
  }
}

export async function requestCancelOrder(
  order: GroupedOrder,
  personId: string,
  bucket: "today" | "week" | "month"
): Promise<boolean> {
  const endpoints: Record<string, string> = {
    today: "menu1/PHPwrite/LiveOrders/RequestCancelOrder.php",
    week: "menu1/PHPwrite/LiveOrders/RequestCancelOrderweek.php",
    month: "menu1/PHPwrite/LiveOrders/RequestCancelOrdermonth.php",
  };

  try {
    const formData = new URLSearchParams();
    formData.append("PersonID", personId);
    formData.append("companyID", order.companyId);
    formData.append("DateandTime", order.dateTime);

    const response = await fetch(SERVER_DOMAIN + endpoints[bucket], {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const text = await response.text();
    return !text.toLowerCase().includes("error");
  } catch (err) {
    console.error("requestCancelOrder error:", err);
    return false;
  }
}

/** Group raw order rows by RandomeCode into checkout sessions */
export function groupOrdersBySession(orders: OrderSummary[]): GroupedOrder[] {
  const map = new Map<string, OrderSummary[]>();

  for (const o of orders) {
    const key = o.RandomeCode || o.DateandTime || o.orderid || "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  }

  const grouped: GroupedOrder[] = [];
  for (const [code, items] of map) {
    const first = items[0];
    grouped.push({
      randomCode: code,
      companyId: first.companyid || first.Companyid || "",
      companyName: first.CompanyName || first.companyname || "Shop",
      companyphoto: first.companyphoto || "",
      dateTime: first.DateandTime || "",
      tableNumber: first.TableNumber || "",
      needTakeaway: first.NeedTakeaway || "0",
      needDelivery: first.NeedDelivery || "0",
      hasPaid: first.HasPaid || "0",
      hasDelivered: first.HasDelivered || "0",
      requestCancel: first.RequestCancel || "0",
      itemCount: items.length,
      items,
    });
  }

  // Sort newest first
  grouped.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  return grouped;
}

export function getCompanyPhotoUrl(photo: string | undefined): string {
  if (!photo) return "";
  if (photo.startsWith("http")) return photo;
  const cleaned = photo.startsWith("/") ? photo.slice(1) : photo;
  return `${SERVER_DOMAIN}menu1/${cleaned}`;
}
