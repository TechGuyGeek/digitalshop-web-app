const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

export interface CompanyOrderItem {
  GroupID?: number | string;
  companyid?: number | string;
  Companyid?: string;
  clientid?: number | string;
  orderid?: number | string;
  Productid?: number | string;
  PersonID?: number | string;
  Name?: string;
  Surname?: string;
  Imagepath?: string;
  DateandTime?: string;
  TableNumber?: string;
  HasPaid?: string;
  HasDelivered?: string;
  NeedDelivery?: string;
  NeedTakeaway?: string;
  RequestCancel?: string;
  RandomeCode?: string;
  TotalItems?: string | number;
  TotalPrice?: string | number;
  OrderPrice?: string | number;
  orderPrice?: string | number;
  CompanyName?: string;
  companyname?: string;
  companyphoto?: string;
  OrderName?: string;
  OrderDesription?: string;
  imagepath?: string;
  [key: string]: unknown;
}

export interface CompanyGroupedOrder {
  groupKey: string;
  companyId: string;
  clientId: string;
  customerName: string;
  customerPhoto: string;
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

/** Fetch company orders for a specific tab using the correct endpoint */
export async function fetchCompanyOrdersByTab(
  personId: string,
  email: string,
  password: string,
  companyId: string,
  tab: "today" | "week" | "month"
): Promise<CompanyOrderItem[]> {
  const endpoints: Record<string, string> = {
    today: "RetriveLiveOrdersSecure.php",
    week: "RetriveLiveOrdersSecureweek.php",
    month: "RetriveLiveOrdersSecuremonth.php",
  };

  try {
    const form = new URLSearchParams();
    form.append("UserID", personId);
    form.append("UserEmail", email);
    form.append("UserPassword", password);
    form.append("companyID", companyId);

    const url = SERVER_DOMAIN + "menu1/PHPread/CompanyLiveOrders/" + endpoints[tab];
    console.log("[CompanyOrders] fetching", tab, "from", url);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const text = await res.text();
    console.log("[CompanyOrders]", tab, "raw response:", text.substring(0, 500));
    if (!text || text.trim() === "" || text.trim() === "[]") return [];

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed as CompanyOrderItem[];
  } catch (err) {
    console.error(`fetchCompanyOrdersByTab(${tab}) error:`, err);
    throw err;
  }
}

/**
 * Group raw order rows by companyid + clientid + DateandTime.
 * Sort descending by DateandTime and calculate totals locally.
 */
export function groupCompanyOrders(orders: CompanyOrderItem[]): CompanyGroupedOrder[] {
  const sorted = [...orders].sort((a, b) =>
    (b.DateandTime || "").localeCompare(a.DateandTime || "")
  );

  const map = new Map<string, CompanyOrderItem[]>();
  for (const order of sorted) {
    const companyId = String(order.companyid || order.Companyid || "");
    const clientId = String(order.clientid || "");
    const dateTime = order.DateandTime || "";
    const hasKeyParts = Boolean(companyId || clientId || dateTime);
    const key = hasKeyParts ? `${companyId}|${clientId}|${dateTime}` : `unknown_${Math.random()}`;

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(order);
  }

  const grouped: CompanyGroupedOrder[] = [];
  for (const [groupKey, items] of map) {
    const first = items[0];
    const totalItems = items.length;

    let totalPrice = 0;
    let hasPrice = false;

    for (const item of items) {
      const rawPrice = item.OrderPrice ?? item.orderPrice ?? item.TotalPrice ?? item.totalPrice;
      if (rawPrice === undefined || rawPrice === null || String(rawPrice).trim() === "") {
        continue;
      }

      const price = parseFloat(String(rawPrice));
      if (!isNaN(price)) {
        totalPrice += price;
        hasPrice = true;
      }
    }

    // If no per-item price found, check if there's a group-level total on the first item
    if (!hasPrice) {
      const groupTotal = first.TotalPrice ?? first.totalPrice ?? (first as any).totalprice;
      if (groupTotal !== undefined && groupTotal !== null && String(groupTotal).trim() !== "") {
        const parsed = parseFloat(String(groupTotal));
        if (!isNaN(parsed)) {
          totalPrice = parsed;
          hasPrice = true;
        }
      }
    }

    const name = [first.Name || "", first.Surname || ""].filter(Boolean).join(" ") || "Customer";

    let customerPhoto = "";
    const imgPath = first.Imagepath || first.imagepath || "";
    if (imgPath) {
      if (imgPath.startsWith("http")) {
        customerPhoto = imgPath;
      } else {
        const cleaned = imgPath.startsWith("/") ? imgPath.slice(1) : imgPath;
        customerPhoto = `${SERVER_DOMAIN}menu1/${cleaned}`;
      }
    }

    grouped.push({
      groupKey,
      companyId: String(first.companyid || first.Companyid || ""),
      clientId: String(first.clientid || ""),
      customerName: name,
      customerPhoto,
      dateTime: first.DateandTime || "",
      tableNumber: first.TableNumber || "",
      needTakeaway: first.NeedTakeaway || "0",
      needDelivery: first.NeedDelivery || "0",
      hasPaid: first.HasPaid || "0",
      hasDelivered: first.HasDelivered || "0",
      requestCancel: first.RequestCancel || "0",
      totalItems,
      totalPrice: hasPrice ? totalPrice.toFixed(2) : "",
      items,
    });
  }

  return grouped;
}
