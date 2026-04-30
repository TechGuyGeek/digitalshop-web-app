const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

// ─── Endpoints (configurable) ───────────────────────────────────
const ENDPOINTS = {
  loadCompany: "menu1/PHPread/Company/DoesCompanyExistorNotSecure.php",
  saveCompany: "menu1/PHPwrite/Company/UpdateCompanyDetailsSecure.php",
  toggleOrder: "menu1/PHPwrite/Company/SaveCompanyOrdersTogglexSecure.php",
  toggleTakeaway: "menu1/PHPwrite/Company/SaveCompanyTakeawaysToggleSecure.php",
  toggleDelivery: "menu1/PHPwrite/Company/SaveCompanyDeliveriesToggleSecure.php",
  toggleGlobal: "menu1/PHPwrite/Company/SaveCompanyLocalGlobalSecure.php",
  updateGPS: "menu1/PHPwrite/Company/UpdateGPS.php",
  countMenuGroup: "menu1/PHPread/CompanyMenu/CountMenuGroup.php",
  liveOrderCountAll: "menu1/PHPread/CompanyLiveOrders/LiveOrderCountAll.php",
  deleteCountMenuGroup: "menu1/PHPread/CompanyMenu/DeleteCountMenuGroup.php",
  liveOrderCount: "menu1/PHPread/CompanyLiveOrders/LiveOrderCount.php",
  liveOrderCountWeek: "menu1/PHPread/CompanyLiveOrders/LiveOrderCountweek.php",
  liveOrderCountMonth: "menu1/PHPread/CompanyLiveOrders/LiveOrderCountmonth.php",
  deleteCompany: "menu1/PHPwrite/Company/DeleteCompanySecure.php",
};

export { SERVER_DOMAIN };

export interface CompanyProfile {
  companyid: number;
  PersonID?: number;
  CompanyName?: string;
  companyname?: string;
  CompanyMobile?: string;
  CompanyEmail?: string;
  OpeningTimes?: string;
  ClosingTimes?: string;
  TableNumbers?: string;
  MenuNotifications?: string;
  LineOneAddress?: string;
  LineTwoAddress?: string;
  LineThreeAddress?: string;
  LineFourAddress?: string;
  LineCountryAddress?: string;
  CompanyDescription?: string;
  companyphoto?: string;
  Imagepath?: string;
  OrderEnable?: string;
  TakeawayEnable?: string;
  DeliveryEnable?: string;
  PayOnPhoneEnable?: string;
  PublicNumber?: string;
  PrivateNumber?: string;
  snippet?: string;
  companyPhotoBackGround?: string;
  LastLoggedOn?: string;
  companylat?: number;
  companylong?: number;
  [key: string]: unknown;
}

// ─── Load company ───────────────────────────────────────────────
export async function loadCompanyProfile(personId: string, email: string): Promise<CompanyProfile | null> {
  try {
    console.log("Loading company for PersonID:", personId, "Email:", email);
    const url = SERVER_DOMAIN + ENDPOINTS.loadCompany;
    console.log("Company API URL:", url);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ PersonID: personId, UserEmail: email }),
    });
    const text = await res.text();
    console.log("Company API response:", text.substring(0, 500));
    if (!text) return null;
    const data = JSON.parse(text);
    // Handle { success: true, companies: [...] } (case-insensitive keys)
    const companies = data.companies || data.Companies;
    const success = data.success ?? data.Success;
    if (success && Array.isArray(companies) && companies.length > 0) {
      const first = companies[0];
      if (first && Number(first.companyid) > 0) {
        return first as CompanyProfile;
      }
    }
    // fallback: array response
    if (Array.isArray(data) && data.length > 0 && Number(data[0].companyid) > 0) {
      return data[0] as CompanyProfile;
    }
    // fallback: single object
    if (data.companyid && Number(data.companyid) > 0) {
      return data as CompanyProfile;
    }
    console.log("No company found in response:", data);
    return null;
  } catch (err) {
    console.error("loadCompanyProfile error:", err);
    return null;
  }
}

// ─── Save company ───────────────────────────────────────────────
export async function saveCompanyProfile(payload: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(SERVER_DOMAIN + ENDPOINTS.saveCompany, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (json.ServerMessage && json.ServerMessage !== "Success") {
        return { success: false, error: json.ServerMessage };
      }
      return { success: true };
    } catch {
      return { success: true };
    }
  } catch (err) {
    return { success: false, error: "Network error" };
  }
}

// ─── Toggle helpers ─────────────────────────────────────────────
async function postToggle(endpoint: string, body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(SERVER_DOMAIN + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data.success === true || data.Success === true;
  } catch {
    return false;
  }
}

export async function toggleOrderEnable(companyid: number, value: string, userId: number, email: string, password: string) {
  const url = SERVER_DOMAIN + ENDPOINTS.toggleOrder;
  const payload = { companyid, OrderEnable: value, UserID: userId, UserEmail: email, UserPassword: password };
  console.log("[toggleOrderEnable] URL:", url);
  console.log("[toggleOrderEnable] Payload:", JSON.stringify(payload));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("[toggleOrderEnable] Status:", res.status);
    const text = await res.text();
    console.log("[toggleOrderEnable] Response:", text);
    try {
      const data = JSON.parse(text);
      return data.success === true || data.Success === true;
    } catch {
      return false;
    }
  } catch (err) {
    console.error("[toggleOrderEnable] Error:", err);
    return false;
  }
}

export async function toggleTakeawayEnable(companyid: number, value: string, userId: number, email: string, password: string) {
  const url = SERVER_DOMAIN + ENDPOINTS.toggleTakeaway;
  const payload = { companyid, TakeawayEnable: value, UserID: userId, UserEmail: email, UserPassword: password };
  console.log("[toggleTakeawayEnable] URL:", url);
  console.log("[toggleTakeawayEnable] Payload:", JSON.stringify(payload));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("[toggleTakeawayEnable] Status:", res.status);
    const text = await res.text();
    console.log("[toggleTakeawayEnable] Response:", text);
    try {
      const data = JSON.parse(text);
      return data.success === true || data.Success === true;
    } catch {
      return false;
    }
  } catch (err) {
    console.error("[toggleTakeawayEnable] Error:", err);
    return false;
  }
}

export async function toggleDeliveryEnable(companyid: number, value: string, userId: number, email: string, password: string) {
  const url = SERVER_DOMAIN + ENDPOINTS.toggleDelivery;
  const payload = { companyid, DeliveryEnable: value, UserID: userId, UserEmail: email, UserPassword: password };
  console.log("[toggleDeliveryEnable] URL:", url);
  console.log("[toggleDeliveryEnable] Payload:", JSON.stringify(payload));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("[toggleDeliveryEnable] Status:", res.status);
    const text = await res.text();
    console.log("[toggleDeliveryEnable] Response:", text);
    try {
      const data = JSON.parse(text);
      return data.ServerMessage === "true" || data.success === true || data.Success === true;
    } catch {
      return false;
    }
  } catch (err) {
    console.error("[toggleDeliveryEnable] Error:", err);
    return false;
  }
}

export async function toggleGlobalEnable(companyid: number, value: string, userId: number, email: string, password: string) {
  const url = SERVER_DOMAIN + ENDPOINTS.toggleGlobal;
  const payload = { companyid, PayOnPhoneEnable: value, UserID: userId, UserEmail: email, UserPassword: password };
  console.log("[toggleGlobalEnable] URL:", url);
  console.log("[toggleGlobalEnable] Payload:", JSON.stringify(payload));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("[toggleGlobalEnable] Status:", res.status);
    const text = await res.text();
    console.log("[toggleGlobalEnable] Response:", text);
    try {
      const data = JSON.parse(text);
      return data.success === true || data.Success === true;
    } catch {
      return false;
    }
  } catch (err) {
    console.error("[toggleGlobalEnable] Error:", err);
    return false;
  }
}

// ─── Update GPS ─────────────────────────────────────────────────
export async function updateCompanyGPS(companyid: number, lat: number, lng: number, personId: number, email: string, password: string): Promise<boolean> {
  return postToggle(ENDPOINTS.updateGPS, { companyid, companylat: lat, companylong: lng, PersonID: personId, Email: email, Password: password });
}

// ─── Count menu groups ──────────────────────────────────────────
export async function countMenuGroups(companyid: number): Promise<string> {
  try {
    const form = new URLSearchParams();
    form.append("companyID", String(companyid));
    const res = await fetch(SERVER_DOMAIN + ENDPOINTS.countMenuGroup, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    return (await res.text()).trim();
  } catch {
    return "ZERO";
  }
}

// ─── Live order counts ─────────────────────────────────────────
export async function liveOrderCountAll(companyid: number): Promise<{ today: number; week: number; month: number }> {
  try {
    const form = new URLSearchParams();
    form.append("companyID", String(companyid));
    const res = await fetch(SERVER_DOMAIN + ENDPOINTS.liveOrderCountAll, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await res.json();
    return { today: Number(data.today) || 0, week: Number(data.week) || 0, month: Number(data.month) || 0 };
  } catch {
    return { today: 0, week: 0, month: 0 };
  }
}

// ─── Delete blockers ────────────────────────────────────────────
const DELETE_COUNT_URLS = {
  menuGroups: "https://app.techguygeek.co.uk/menu1/PHPread/CompanyMenu/DeleteCountMenuGroup.php",
  dayOrders: "https://app.techguygeek.co.uk/menu1/PHPread/CompanyLiveOrders/DeleteLiveOrderCount.php",
  weekOrders: "https://app.techguygeek.co.uk/menu1/PHPread/CompanyLiveOrders/DeleteLiveOrderCountweek.php",
  monthOrders: "https://app.techguygeek.co.uk/menu1/PHPread/CompanyLiveOrders/DeleteLiveOrderCountmonth.php",
};

async function fetchDeleteCount(url: string, companyid: number): Promise<number> {
  try {
    const form = new URLSearchParams();
    form.append("companyid", String(companyid));
    console.log("[deleteBlocker] POST", url, "companyid:", companyid);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const text = (await res.text()).trim();
    console.log("[deleteBlocker] raw response from", url, ":", text);
    const n = parseInt(text, 10);
    return isNaN(n) ? 0 : n;
  } catch (err) {
    console.error("[deleteBlocker] fetch error:", url, err);
    return 0;
  }
}

export async function getDeleteBlockers(companyid: number) {
  const [menuGroups, dayOrders, weekOrders, monthOrders] = await Promise.all([
    fetchDeleteCount(DELETE_COUNT_URLS.menuGroups, companyid),
    fetchDeleteCount(DELETE_COUNT_URLS.dayOrders, companyid),
    fetchDeleteCount(DELETE_COUNT_URLS.weekOrders, companyid),
    fetchDeleteCount(DELETE_COUNT_URLS.monthOrders, companyid),
  ]);
  const total = menuGroups + dayOrders + weekOrders + monthOrders;
  console.log("[deleteBlocker] counts:", { menuGroups, dayOrders, weekOrders, monthOrders, total });
  return { menuGroups, dayOrders, weekOrders, monthOrders, total };
}

// ─── Delete company (form POST) ────────────────────────────────
export async function deleteCompany(companyid: number, userId: number, email: string, password: string): Promise<{ success: boolean; message?: string }> {
  const url = SERVER_DOMAIN + ENDPOINTS.deleteCompany;
  try {
    const form = new URLSearchParams();
    form.append("UserID", String(userId));
    form.append("UserEmail", email);
    form.append("UserPassword", password);
    form.append("companyID", String(companyid));
    form.append("companyid", String(companyid));
    console.log("[deleteCompany] POST", url);
    console.log("[deleteCompany] body fields:", Object.fromEntries(form.entries()));
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    console.log("[deleteCompany] status:", res.status);
    const text = await res.text();
    console.log("[deleteCompany] raw response:", text);
    try {
      const data = JSON.parse(text);
      if (data.success === true) {
        return { success: true, message: data.ServerMessage };
      }
      return { success: false, message: data.ServerMessage || "Delete failed" };
    } catch {
      return { success: false, message: "Invalid server response" };
    }
  } catch (err) {
    console.error("[deleteCompany] fetch error:", err);
    return { success: false, message: "Network error" };
  }
}

// ─── Image URL helper ───────────────────────────────────────────
export function getCompanyImageUrl(companyphoto?: string): string {
  if (!companyphoto) return "";
  if (companyphoto.startsWith("/")) {
    return encodeURI(SERVER_DOMAIN + "menu1" + companyphoto);
  }
  if (companyphoto.startsWith("http")) return companyphoto;
  return encodeURI(SERVER_DOMAIN + "menu1/" + companyphoto);
}

// ─── Save map marker ────────────────────────────────────────────
export async function saveMapMarker(
  companyid: number, publicNumber: number, userId: number, email: string, password: string
): Promise<boolean> {
  const url = SERVER_DOMAIN + "menu1/PHPwrite/Company/SaveCompanyMapMarkerSecure.php";
  const payload = { companyid, PublicNumber: publicNumber, PersonID: userId, UserEmail: email, UserPassword: password };
  console.log("[saveMapMarker] URL:", url);
  console.log("[saveMapMarker] Payload:", JSON.stringify(payload));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("[saveMapMarker] Status:", res.status);
    const text = await res.text();
    console.log("[saveMapMarker] Response:", text);
    try {
      const data = JSON.parse(text);
      return data.success === true || data.Success === true;
    } catch {
      return res.ok;
    }
  } catch (err) {
    console.error("[saveMapMarker] Error:", err);
    return false;
  }
}

// ─── Update Payment Method ─────────────────────────────────────
export async function updatePaymentMethod(
  companyid: number,
  userId: number,
  paymentMethod: number,
): Promise<{ success: boolean; message?: string }> {
  const url = SERVER_DOMAIN + "menu1/PHPwrite/Company/UpdateCompanyPaymentMethodSecure.php";
  try {
    const form = new URLSearchParams();
    form.append("companyID", String(companyid));
    form.append("UserID", String(userId));
    form.append("PaymentMethod", String(paymentMethod));
    console.log("[updatePaymentMethod] POST", url, Object.fromEntries(form.entries()));
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const text = await res.text();
    console.log("[updatePaymentMethod] response:", text);
    try {
      const data = JSON.parse(text);
      return { success: data.success === true, message: data.message };
    } catch {
      return { success: false, message: "Invalid server response" };
    }
  } catch (err) {
    console.error("[updatePaymentMethod] error:", err);
    return { success: false, message: "Network error" };
  }
}

// ─── Map marker mapping ────────────────────────────────────────
export const MAP_MARKER_EMOJIS: Record<string, { emoji: string; label: string }> = {
  "0": { emoji: "📍", label: "Google" },
  "1": { emoji: "🏪", label: "Shop" },
  "2": { emoji: "🍻", label: "Pub" },
  "3": { emoji: "☕", label: "Cafe" },
  "4": { emoji: "🍴", label: "Restaurant" },
  "5": { emoji: "🏠", label: "Home" },
  "6": { emoji: "🎪", label: "Mobile" },
  "7": { emoji: "🧸", label: "Toys" },
  "8": { emoji: "🥪", label: "Sandwiches" },
  "9": { emoji: "📍", label: "Google" },
  "10": { emoji: "🍳", label: "Breakfast" },
  "11": { emoji: "👔", label: "Mens Clothing" },
  "12": { emoji: "👗", label: "Ladies Clothing" },
  "13": { emoji: "🔢", label: "Digits" },
};

export function getMarkerForPublicNumber(publicNumber?: string) {
  return MAP_MARKER_EMOJIS[publicNumber || "0"] || MAP_MARKER_EMOJIS["0"];
}
