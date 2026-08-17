import { AuthApiError, authenticatedFetch } from "@/lib/authClient";

const SERVER_DOMAIN = "https://web.gpsshops.com/";

const COMPANY_V1_URL = "https://web.gpsshops.com/menu1/api/v1/company.php";

export interface CompanyV1 {
  id: number; name: string; mobile_number: string; company_email: string; image_path: string;
  latitude: number; longitude: number; opening_time: string; closing_time: string; table_numbers: string;
  notifications_enabled: boolean; orders_enabled: boolean; takeaway_enabled: boolean; delivery_enabled: boolean;
  global_enabled: boolean; map_marker: number; payment_method: number; stripe_enabled: boolean;
  line_one_address: string; line_two_address: string; line_three_address: string; line_four_address: string;
  country: string; description: string;
}

export type CompanyWrite = Omit<CompanyV1, "id" | "image_path" | "stripe_enabled"> & { image_base64?: string };

async function companyEnvelope(response: Response): Promise<{ company?: CompanyV1; deleted?: boolean }> {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    const error = new AuthApiError(response.status, body?.error?.code || "company_request_failed", body?.error?.message || "Company request failed.");
    Object.assign(error, { details: body?.error?.details });
    throw error;
  }
  return body.data;
}

export async function getOwnedCompany(): Promise<CompanyV1 | null> {
  return (await companyEnvelope(await authenticatedFetch(COMPANY_V1_URL))).company || null;
}

export async function createOwnedCompany(input: Pick<CompanyWrite, "name" | "company_email" | "latitude" | "longitude">): Promise<CompanyV1> {
  const response = await authenticatedFetch(COMPANY_V1_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  return (await companyEnvelope(response)).company!;
}

export async function updateOwnedCompany(input: CompanyWrite): Promise<CompanyV1> {
  const response = await authenticatedFetch(COMPANY_V1_URL, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  return (await companyEnvelope(response)).company!;
}

export async function deleteOwnedCompany(): Promise<void> {
  const response = await authenticatedFetch(COMPANY_V1_URL, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: "{}" });
  await companyEnvelope(response);
}

// ─── Endpoints (configurable) ───────────────────────────────────
const ENDPOINTS = {
  countMenuGroup: "menu1/PHPread/CompanyMenu/CountMenuGroup.php",
  liveOrderCountAll: "menu1/PHPread/CompanyLiveOrders/LiveOrderCountAll.php",
};

export { SERVER_DOMAIN };


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

// ─── Image URL helper ───────────────────────────────────────────
export function getCompanyImageUrl(companyphoto?: string): string {
  if (!companyphoto) return "";
  if (companyphoto.startsWith("/")) {
    return encodeURI(SERVER_DOMAIN + "menu1" + companyphoto);
  }
  if (companyphoto.startsWith("http")) return companyphoto;
  return encodeURI(SERVER_DOMAIN + "menu1/" + companyphoto);
}

// ─── Map marker mapping ────────────────────────────────────────
// Icons are PNGs hosted on gpsshops.com so the web app and MAUI app
// share the same assets. The emoji field is kept only as a text
// fallback for legacy callers.
const MARKER_ICON_BASE = "https://gpsshops.com/map-icons/";

export const MAP_MARKER_EMOJIS: Record<string, { emoji: string; label: string; translationKey: string; iconUrl: string }> = {
  "0":  { emoji: "📍", label: "Google",          translationKey: "GoogleIcon",         iconUrl: MARKER_ICON_BASE + "google09.png" },
  "1":  { emoji: "🏪", label: "Shop",            translationKey: "ShopIcon",           iconUrl: MARKER_ICON_BASE + "shop01.png" },
  "2":  { emoji: "🍻", label: "Pub",             translationKey: "PubIcon",            iconUrl: MARKER_ICON_BASE + "pub02.png" },
  "3":  { emoji: "☕", label: "Cafe",            translationKey: "CafeIcon",           iconUrl: MARKER_ICON_BASE + "cafe03.png" },
  "4":  { emoji: "🍴", label: "Restaurant",      translationKey: "RestaurantIcon",     iconUrl: MARKER_ICON_BASE + "restaurant04.png" },
  "5":  { emoji: "🏠", label: "Home",            translationKey: "HomeIcon",           iconUrl: MARKER_ICON_BASE + "home05.png" },
  "6":  { emoji: "🎪", label: "Mobile",          translationKey: "MobileIcon",         iconUrl: MARKER_ICON_BASE + "mobile06.png" },
  "7":  { emoji: "🧸", label: "Toys",            translationKey: "ToysIcon",           iconUrl: MARKER_ICON_BASE + "toys07.png" },
  "8":  { emoji: "🥪", label: "Sandwiches",      translationKey: "SandwichesIcon",     iconUrl: MARKER_ICON_BASE + "sandwichs08.png" },
  "9":  { emoji: "📍", label: "Google",          translationKey: "GoogleIcon",         iconUrl: MARKER_ICON_BASE + "google09.png" },
  "10": { emoji: "🍳", label: "Breakfast",       translationKey: "BreakfastIcon",      iconUrl: MARKER_ICON_BASE + "breakfast10.png" },
  "11": { emoji: "👔", label: "Mens Clothing",   translationKey: "MensClothingIcon",   iconUrl: MARKER_ICON_BASE + "clothing11.png" },
  "12": { emoji: "👗", label: "Ladies Clothing", translationKey: "LadiesClothingIcon", iconUrl: MARKER_ICON_BASE + "clothing12.png" },
  "13": { emoji: "🔢", label: "Digits",          translationKey: "DigitsIcon",         iconUrl: MARKER_ICON_BASE + "digit.png" },
  "14": { emoji: "🥐", label: "Bakery",          translationKey: "BakeryIcon",         iconUrl: MARKER_ICON_BASE + "Bakery14.png" },
  "15": { emoji: "🍕", label: "Pizza",           translationKey: "PizzaIcon",          iconUrl: MARKER_ICON_BASE + "Ptizza15.png" },
  "16": { emoji: "🦷", label: "Dentist",         translationKey: "DentistIcon",        iconUrl: MARKER_ICON_BASE + "Dentist16.png" },
  "17": { emoji: "🐾", label: "Pets",            translationKey: "PetsIcon",           iconUrl: MARKER_ICON_BASE + "Pets17.png" },
  "18": { emoji: "🎬", label: "Movies",          translationKey: "MoviesIcon",         iconUrl: MARKER_ICON_BASE + "Movies18.png" },
  "19": { emoji: "🏋️", label: "Gym",             translationKey: "GymIcon",            iconUrl: MARKER_ICON_BASE + "Gym19.png" },
  "20": { emoji: "💊", label: "Chemist",         translationKey: "ChemistIcon",        iconUrl: MARKER_ICON_BASE + "Chemist20.png" },
  "21": { emoji: "💈", label: "Barbers",         translationKey: "BarbersIcon",        iconUrl: MARKER_ICON_BASE + "Barbers21.png" },
  "22": { emoji: "👠", label: "Fashion",         translationKey: "FashionIcon",        iconUrl: MARKER_ICON_BASE + "Fashion22.png" },
};

export function getMarkerForPublicNumber(publicNumber?: string) {
  const key = String(publicNumber ?? "0").trim() || "0";
  const found = MAP_MARKER_EMOJIS[key];
  if (!found) {
    console.warn("[getMarkerForPublicNumber] Unknown PublicNumber, falling back to Google:", publicNumber);
    return MAP_MARKER_EMOJIS["0"];
  }
  return found;
}
