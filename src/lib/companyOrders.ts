const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

export interface CompanyOrderItem {
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
  OrderName?: string;
  OrderPrice?: string;
  OrderDesription?: string;
  imagepath?: string;
  [key: string]: unknown;
}

export interface CompanyGroupedOrder {
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
  totalItems: number;
  totalPrice: string;
  items: CompanyOrderItem[];
}

/** Check order counts using the combined endpoint */
export async function fetchOrderCountCombined(companyId: string): Promise<{ today: number; week: number; month: number }> {
  try {
    const form = new URLSearchParams();
    form.append("companyid", companyId);

    const res = await fetch(SERVER_DOMAIN + "menu1/PHPread/CompanyLiveOrders/LiveOrderCountCombined.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const data = await res.json();
    return {
      today: parseInt(data.today || "0", 10),
      week: parseInt(data.week || "0", 10),
      month: parseInt(data.month || "0", 10),
    };
  } catch (err) {
    console.error("fetchOrderCountCombined error:", err);
    return { today: 0, week: 0, month: 0 };
  }
}

/** Retrieve all company orders using the secure endpoint */
export async function fetchCompanyOrders(
  personId: string,
  email: string,
  password: string,
  companyId: string
): Promise<CompanyOrderItem[]> {
  try {
    const form = new URLSearchParams();
    form.append("UserID", personId);
    form.append("UserEmail", email);
    form.append("UserPassword", password);
    form.append("companyID", companyId);

    const res = await fetch(SERVER_DOMAIN + "menu1/PHPread/CompanyLiveOrders/RetriveLiveOrdersSecure.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const text = await res.text();
    if (!text || text.trim() === "" || text.trim() === "[]") return [];

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed as CompanyOrderItem[];
  } catch (err) {
    console.error("fetchCompanyOrders error:", err);
    return [];
  }
}

/** Group raw order rows by RandomeCode */
export function groupCompanyOrders(orders: CompanyOrderItem[]): CompanyGroupedOrder[] {
  const map = new Map<string, CompanyOrderItem[]>();

  for (const o of orders) {
    const key = o.RandomeCode || o.DateandTime || o.orderid || "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  }

  const grouped: CompanyGroupedOrder[] = [];
  for (const [code, items] of map) {
    const first = items[0];

    // Sum total price from items
    let totalPrice = 0;
    let totalItems = 0;
    for (const item of items) {
      const price = parseFloat(String(item.TotalPrice || item.OrderPrice || "0"));
      if (!isNaN(price)) totalPrice += price;
      const count = parseInt(String(item.TotalItems || "1"), 10);
      totalItems += isNaN(count) ? 1 : count;
    }

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
      totalItems,
      totalPrice: totalPrice.toFixed(2),
      items,
    });
  }

  grouped.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  return grouped;
}

/** Filter orders by date range client-side */
export function filterOrdersByTab(
  orders: CompanyGroupedOrder[],
  tab: "today" | "week" | "month"
): CompanyGroupedOrder[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (tab === "today") {
    return orders.filter((o) => {
      const d = new Date(o.dateTime);
      return d >= startOfToday;
    });
  }

  if (tab === "week") {
    const weekAgo = new Date(startOfToday);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return orders.filter((o) => {
      const d = new Date(o.dateTime);
      return d >= weekAgo;
    });
  }

  // month
  const monthAgo = new Date(startOfToday);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  return orders.filter((o) => {
    const d = new Date(o.dateTime);
    return d >= monthAgo;
  });
}

export function getCompanyOrderPhotoUrl(photo: string | undefined): string {
  if (!photo) return "";
  if (photo.startsWith("http")) return photo;
  const cleaned = photo.startsWith("/") ? photo.slice(1) : photo;
  return `${SERVER_DOMAIN}menu1/${cleaned}`;
}
