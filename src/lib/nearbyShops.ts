import {
  FREE_PAID_RADIUS_MILES,
  fetchPublicGlobalShops,
  fetchPublicNearbyShops,
  type NearbyShop,
} from "@/lib/publicShopsApi";
import type { Coordinates } from "@/lib/geo";

export type { NearbyShop } from "@/lib/publicShopsApi";

export interface NearbyCompany {
  companyid: number;
  companyname?: string;
  companylat?: number | string;
  companylong?: number | string;
  companyphoto?: string;
  CompanyDescription?: string;
  PublicNumber?: number | string;
}

export function fetchGlobalShops(userPosition: Coordinates | null = null): Promise<NearbyShop[]> {
  return fetchPublicGlobalShops(userPosition);
}

function uniqueByCompanyId(shops: NearbyShop[]): NearbyShop[] {
  return [...new Map(shops.map((shop) => [shop.companyid, shop])).values()]
    .sort((left, right) => (left.distance ?? Infinity) - (right.distance ?? Infinity));
}

/**
 * Free Shops uses the existing nearby Free/Paid result and additionally shows
 * Global-tier shops that are physically within the same local one-mile range.
 * The dedicated Paid and Global views retain their canonical API contracts.
 */
export async function fetchNearbyShops(
  lat: number | undefined,
  lng: number | undefined,
  variant: "free" | "paid" = "free",
): Promise<NearbyShop[]> {
  if (variant === "paid") return fetchPublicNearbyShops(lat, lng, "paid");

  const userPosition = lat !== undefined && lng !== undefined ? { lat, lng } : null;
  const [localShops, globalShops] = await Promise.all([
    fetchPublicNearbyShops(lat, lng, "free"),
    fetchPublicGlobalShops(userPosition),
  ]);
  const nearbyGlobalShops = globalShops.filter(
    (shop) => shop.distance !== null && shop.distance <= FREE_PAID_RADIUS_MILES,
  );
  return uniqueByCompanyId([...localShops, ...nearbyGlobalShops]);
}
