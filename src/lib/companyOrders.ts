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
  orderId: string;
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

const COMPANY_ORDER_DELETE_ENDPOINTS: Record<"today" | "week" | "month", string> = {
  today: "DeleteusersOrder2Secure.php",
  week: "DeleteusersOrder2Secureweek.php",
  month: "DeleteusersOrder2Securemonth.php",
};

const COMPANY_ORDER_DELETE_BASE = SERVER_DOMAIN + "menu1/PHPwrite/ClientMenu/";

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
    if (parsed.length > 0) {
      console.log("[CompanyOrders] first row ALL keys:", Object.keys(parsed[0]));
      console.log("[CompanyOrders] first row data:", JSON.stringify(parsed[0]));
    }
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
      orderId: String(first.orderid || ""),
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

/** Toggle Paid or Delivered for order items, using tab-specific endpoints */
export async function toggleCompanyOrderFlag(
  tab: "today" | "week" | "month",
  flag: "HasPaid" | "HasDelivered",
  newValue: string,
  order: CompanyGroupedOrder,
  userId: string,
  email: string,
  password: string
): Promise<CompanyOrderItem[] | null> {
  const paidEndpoints: Record<string, string> = {
    today: "SavePayedorNotToggleSecure_web.php",
    week: "SavePayedorNotToggleSecureweek_web.php",
    month: "SavePayedorNotToggleSecuremonth_web.php",
  };
  const deliveredEndpoints: Record<string, string> = {
    today: "SaveDELIVEREDORNOTToggleSecure_web.php",
    week: "SaveDELIVEREDORNOTToggleSecureweek_web.php",
    month: "SaveDELIVEREDORNOTToggleSecuremonth_web.php",
  };

  const endpoints = flag === "HasPaid" ? paidEndpoints : deliveredEndpoints;
  const url = SERVER_DOMAIN + "menu1/PHPwrite/LiveOrders/" + endpoints[tab];
  const firstItem = order.items[0];
  const companyId = String(firstItem?.companyid || firstItem?.Companyid || order.companyId || "");
  const orderId = String(firstItem?.orderid || "");
  const clientId = String(firstItem?.clientid || order.clientId || "");
  const groupId = String(firstItem?.GroupID || "");

  const body: Record<string, string> = {
    companyid: companyId,
    companyID: companyId,
    orderid: orderId,
    OrderID: orderId,
    clientid: clientId,
    ClientID: clientId,
    UserID: String(userId),
    PersonID: String(userId),
    Email: email,
    Password: password,
    UserEmail: email,
    UserPassword: password,
    [flag]: newValue,
  };

  if (groupId) {
    body.GroupID = groupId;
  }

  try {
    console.log("[toggleFlag] endpoint:", url);
    console.log("[toggleFlag] request body:", body);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log("[toggleFlag] HTTP status:", res.status);
    console.log("[toggleFlag] raw response:", text);
    if (text === "false") {
      console.error("[toggleFlag] server returned false", { status: res.status, body });
      return null;
    }

    // Server may return empty body, "true", or updated array — all mean success
    if (!text.trim() || text.trim().toLowerCase() === "true") {
      return [];
    }

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed as CompanyOrderItem[];
      }
      console.error("[toggleFlag] unexpected response shape", parsed);
      return null;
    } catch (err) {
      console.error("[toggleFlag] invalid JSON response", text, err);
      return null;
    }
  } catch (err) {
    console.error("[toggleFlag] error:", err);
    return null;
  }
}

/** Delete a company order using tab-specific endpoints */
export async function deleteCompanyOrder(
  tab: "today" | "week" | "month",
  order: CompanyGroupedOrder,
  userId: string,
  email: string,
  password: string
): Promise<{ success: boolean; message?: string }> {
  const url = COMPANY_ORDER_DELETE_BASE + COMPANY_ORDER_DELETE_ENDPOINTS[tab];
  // Always read the orderid directly off the selected order row passed in,
  // not from any cached/previous state. Prefer the explicit orderId on the
  // grouped object, fall back to the first item's orderid.
  const selectedOrderId = String(order.orderId || order.items?.[0]?.orderid || "");

  const form = new URLSearchParams();
  form.append("UserID", userId);
  form.append("UserEmail", email);
  form.append("UserPassword", password);
  form.append("companyID", order.companyId);
  form.append("clientid", order.clientId);
  form.append("orderid", selectedOrderId);
  form.append("Date", order.dateTime);

   const requestBody = form.toString();
   const requestFields = Object.fromEntries(form.entries());
   const requestHeaders = { "Content-Type": "application/x-www-form-urlencoded" };

  console.log("[deleteOrder][ClientMenuDebug] tab:", tab);
  console.log("[deleteOrder][ClientMenuDebug] exact endpoint file:", COMPANY_ORDER_DELETE_ENDPOINTS[tab]);
  console.log("[deleteOrder][ClientMenuDebug] request URL:", url);
  console.log("[deleteOrder][ClientMenuDebug] request headers:", requestHeaders);
  console.log("[deleteOrder][ClientMenuDebug] POST body fields:", requestFields);
  console.log("[deleteOrder][ClientMenuDebug] encoded POST body:", requestBody);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: requestHeaders,
      body: requestBody,
    });

    console.log("[deleteOrder][ClientMenuDebug] response.url:", res.url);
    console.log("[deleteOrder][ClientMenuDebug] response.status:", res.status);
    console.log("[deleteOrder][ClientMenuDebug] response.ok:", res.ok);

    const text = await res.text();
    console.log("[deleteOrder][ClientMenuDebug] raw response text:", text);

    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
      console.log("[deleteOrder][ClientMenuDebug] parsed response:", parsed);
    } catch (parseError) {
      console.log(
        "[deleteOrder][ClientMenuDebug] JSON parse skipped:",
        parseError instanceof Error ? parseError.message : String(parseError)
      );
    }

    if (!res.ok) {
      return { success: false, message: parsed?.Message || text.trim() || `HTTP ${res.status}` };
    }

    if (parsed?.Result === true) {
      return { success: true, message: parsed?.Message };
    }

    return { success: false, message: parsed?.Message || text.trim() };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[deleteOrder][ClientMenuDebug] fetch exception message:", errorMessage);
    console.error("[deleteOrder][ClientMenuDebug] fetch exception object:", err);
    return { success: false, message: errorMessage || "Network error" };
  }
}
