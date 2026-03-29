const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

export interface OrderSummary {
  clientid?: string;
  Companyid?: string;
  companyid?: string;
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
  PaymentStatus?: string;
  DeliveryStatus?: string;
  RandomeCode?: string;
  [key: string]: unknown;
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
  order: OrderSummary,
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
    formData.append("companyID", order.Companyid || order.companyid || "");
    formData.append("Orderid", order.Orderid || "");
    formData.append("DateandTime", order.DateandTime || "");

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

/** Group orders by DateandTime, taking the first of each group (matching MAUI behaviour) */
export function groupOrdersByDate(orders: OrderSummary[]): OrderSummary[] {
  const sorted = [...orders].sort((a, b) => {
    const da = a.DateandTime || "";
    const db = b.DateandTime || "";
    return db.localeCompare(da);
  });

  const seen = new Set<string>();
  const grouped: OrderSummary[] = [];
  for (const o of sorted) {
    const key = o.DateandTime || "";
    if (!seen.has(key)) {
      seen.add(key);
      grouped.push(o);
    }
  }
  return grouped;
}
