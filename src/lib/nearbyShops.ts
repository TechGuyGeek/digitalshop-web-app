import { fetchPublicGlobalShops, fetchPublicNearbyShops, type NearbyShop } from "@/lib/publicShopsApi";
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

export function fetchNearbyShops(
  lat: number | undefined,
  lng: number | undefined,
  variant: "free" | "paid" = "free",
): Promise<NearbyShop[]> {
  return fetchPublicNearbyShops(lat, lng, variant);
}
