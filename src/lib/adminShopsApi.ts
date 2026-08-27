import { API_ORIGIN, AuthApiError, authenticatedFetch } from "@/lib/authClient";
import { haversineMiles, isValidCoordinate, type Coordinates } from "@/lib/geo";
import type { NearbyShop } from "@/lib/nearbyShops";
import { getCategoryByCode } from "@/lib/shopCategories";

export const ADMIN_SHOPS_URL = `${API_ORIGIN}/menu1/api/v1/admin-shops.php`;

function text(row: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value == null) continue;
    const result = String(value).trim();
    if (result && result.toLowerCase() !== "null") return result;
  }
  return undefined;
}

function numberValue(row: Record<string, unknown>, ...keys: string[]): number | undefined {
  const value = text(row, ...keys);
  if (value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseAdminShop(row: unknown, userPosition: Coordinates | null): NearbyShop | null {
  if (!row || typeof row !== "object") return null;
  const source = row as Record<string, unknown>;
  const companyid = numberValue(source, "companyid", "CompanyID", "companyID");
  const lat = numberValue(source, "companylat", "lat", "latitude");
  const lng = numberValue(source, "companylong", "lng", "longitude");
  if (!companyid || !isValidCoordinate(lat !== undefined && lng !== undefined ? { lat, lng } : null)) return null;
  const category = getCategoryByCode(numberValue(source, "PublicNumber") ?? 0);
  return {
    companyid,
    name: text(source, "companyname", "CompanyName") || "Unknown Shop",
    icon: category.emoji,
    lat,
    lng,
    photo: text(source, "companyphoto", "CompanyPhoto"),
    categoryCode: category.id,
    categoryLabel: category.label,
    distance: userPosition ? haversineMiles(userPosition, { lat, lng }) : null,
  };
}

export async function fetchAdminShops(userPosition: Coordinates | null = null): Promise<NearbyShop[]> {
  const response = await authenticatedFetch(ADMIN_SHOPS_URL);
  const body = await response.json().catch(() => null) as { success?: boolean; data?: unknown; error?: { code?: string; message?: string } } | null;
  if (!response.ok || !body?.success) {
    throw new AuthApiError(response.status, body?.error?.code || "admin_request_failed", body?.error?.message || "Admin shop request failed.");
  }
  if (!Array.isArray(body.data)) throw new AuthApiError(502, "invalid_admin_response", "The admin shop response was invalid.");
  const validPosition = isValidCoordinate(userPosition) ? userPosition : null;
  return body.data.map((row) => parseAdminShop(row, validPosition)).filter((row): row is NearbyShop => row !== null);
}
