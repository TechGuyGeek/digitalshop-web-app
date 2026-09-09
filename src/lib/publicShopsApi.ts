import { API_ORIGIN, getMenuImageUrl } from "@/lib/authClient";
import { getCategoryByCode } from "@/lib/shopCategories";
import { haversineMiles, isValidCoordinate, type Coordinates } from "@/lib/geo";
import { presetSrc, stableFallbackPresetKey } from "@/lib/menuGroupImages";

export const PUBLIC_SHOPS_URL = `${API_ORIGIN}/menu1/api/v1/public-shops.php`;
export const FREE_PAID_RADIUS_MILES = 1;
/** The server applies each company's canonical effective metre radius; this request cap covers the 100 km Pro maximum. */
export const PAID_REQUEST_RADIUS_MILES = 100;
export const MENU_GROUP_ASPECT_RATIO = "3/1";
export const PRODUCT_IMAGE_ASPECT_RATIO = "16/9";

export interface NearbyShop {
  companyid: number;
  name: string;
  icon: string;
  lat: number;
  lng: number;
  photo?: string;
  description?: string;
  categoryCode: number;
  categoryLabel: string;
  distance: number | null;
}

export interface PublicShopDetail {
  companyid: number;
  companyname: string;
  companyphoto?: string;
  CompanyMobile?: string;
  CompanyEmail?: string;
  OpeningTimes?: string;
  ClosingTimes?: string;
  TableNumbers?: string;
  MenuNotifications?: string;
  OrderEnable?: string;
  TakeawayEnable?: string;
  DeliveryEnable?: string;
  PayOnPhoneEnable?: string;
  PaymentMethod?: string;
  LineOneAddress?: string;
  LineTwoAddress?: string;
  LineThreeAddress?: string;
  LineFourAddress?: string;
  LineCountryAddress?: string;
  CompanyDescription?: string;
  LastLoggedOn?: string;
  PublicNumber?: number;
  companylat?: number | null;
  companylong?: number | null;
}

export interface PublicMenuGroup {
  ID: string;
  OrderGroup: string;
  MenuEnable: string;
  imageSource?: "preset" | "custom" | "none";
  presetKey?: string | null;
  customImagePath?: string | null;
  updatedAt?: string | null;
}

export interface PublicProduct {
  ID: string;
  GroupID: string;
  OrderName: string;
  OrderPrice?: string;
  OrderDesription?: string;
  imagepath?: string;
  ImageSize?: string;
  MenuEnable?: string;
  images?: string[];
  youtube_video_id?: string | null;
}

async function publicData(params: Record<string, string>): Promise<unknown[]> {
  const url = new URL(PUBLIC_SHOPS_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url);
  const body = await response.json().catch(() => null) as { success?: boolean; data?: unknown; error?: { message?: string } } | null;
  if (!response.ok || !body?.success) throw new Error(body?.error?.message || "Public shop request failed.");
  if (Array.isArray(body.data)) return body.data;
  if (body.data && typeof body.data === "object") return [body.data];
  throw new Error("The public shop response was malformed.");
}

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

function parseNearbyShop(row: unknown, userPosition: Coordinates | null): NearbyShop | null {
  if (!row || typeof row !== "object") return null;
  const source = row as Record<string, unknown>;
  const companyid = numberValue(source, "companyid", "CompanyID", "companyID");
  const lat = numberValue(source, "companylat", "lat", "latitude");
  const lng = numberValue(source, "companylong", "lng", "longitude");
  if (!companyid || !isValidCoordinate(lat !== undefined && lng !== undefined ? { lat, lng } : null)) return null;
  const publicNumber = numberValue(source, "PublicNumber") ?? 0;
  const category = getCategoryByCode(publicNumber);
  return {
    companyid,
    name: text(source, "companyname", "CompanyName") || "Unknown Shop",
    icon: category.emoji,
    lat,
    lng,
    photo: text(source, "companyphoto", "CompanyPhoto", "Imagepath", "ImagePath", "image_path", "companypath"),
    description: text(source, "CompanyDescription", "description"),
    categoryCode: category.id,
    categoryLabel: category.label,
    distance: userPosition ? haversineMiles(userPosition, { lat, lng }) : null,
  };
}

export async function fetchPublicNearbyShops(
  lat: number | undefined,
  lng: number | undefined,
  tier: "free" | "paid",
): Promise<NearbyShop[]> {
  const userPosition = isValidCoordinate(lat !== undefined && lng !== undefined ? { lat, lng } : null)
    ? { lat, lng } as Coordinates
    : null;
  const rows = await publicData({
    lat: String(userPosition?.lat ?? 0),
    lon: String(userPosition?.lng ?? 0),
    tier,
    radius: String(tier === "paid" ? PAID_REQUEST_RADIUS_MILES : FREE_PAID_RADIUS_MILES),
  });
  return rows.map((row) => parseNearbyShop(row, userPosition)).filter((row): row is NearbyShop => row !== null);
}

export async function fetchPublicGlobalShops(userPosition: Coordinates | null = null): Promise<NearbyShop[]> {
  const rows = await publicData({ tier: "global" });
  return rows.map((row) => parseNearbyShop(row, isValidCoordinate(userPosition) ? userPosition : null))
    .filter((row): row is NearbyShop => row !== null);
}

export async function fetchPublicShopDetail(companyId: number): Promise<PublicShopDetail | null> {
  const rows = await publicData({ action: "detail", company_id: String(companyId) });
  const source = rows[0];
  if (!source || typeof source !== "object") return null;
  const row = source as Record<string, unknown>;
  const id = numberValue(row, "companyid", "CompanyID", "companyID");
  if (!id || id <= 0) return null;
  return {
    companyid: id,
    companyname: text(row, "companyname", "CompanyName") || "Unknown Shop",
    companyphoto: text(row, "companyphoto", "CompanyPhoto", "Imagepath", "ImagePath", "image_path", "companypath"),
    CompanyMobile: text(row, "CompanyMobile", "companymobile"),
    CompanyEmail: text(row, "CompanyEmail", "companyemail"),
    OpeningTimes: text(row, "OpeningTimes", "openingTimes"),
    ClosingTimes: text(row, "ClosingTimes", "closingTimes"),
    TableNumbers: text(row, "TableNumbers"),
    MenuNotifications: text(row, "MenuNotifications"),
    OrderEnable: text(row, "OrderEnable"),
    TakeawayEnable: text(row, "TakeawayEnable"),
    DeliveryEnable: text(row, "DeliveryEnable"),
    PayOnPhoneEnable: text(row, "PayOnPhoneEnable"),
    PaymentMethod: text(row, "PaymentMethod", "payment_method"),
    LineOneAddress: text(row, "LineOneAddress"),
    LineTwoAddress: text(row, "LineTwoAddress"),
    LineThreeAddress: text(row, "LineThreeAddress"),
    LineFourAddress: text(row, "LineFourAddress"),
    LineCountryAddress: text(row, "LineCountryAddress"),
    CompanyDescription: text(row, "CompanyDescription", "description"),
    LastLoggedOn: text(row, "LastLoggedOn"),
    PublicNumber: numberValue(row, "PublicNumber"),
    companylat: numberValue(row, "companylat", "lat", "latitude") ?? null,
    companylong: numberValue(row, "companylong", "lng", "longitude") ?? null,
  };
}

export async function fetchPublicMenuGroups(companyId: number): Promise<PublicMenuGroup[]> {
  const rows = await publicData({ action: "menu", resource: "groups", company_id: String(companyId) });
  return rows.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    const id = numberValue(row, "ID", "id");
    if (!id) return [];
    return [{
      ID: String(id),
      OrderGroup: text(row, "OrderGroup", "name") || "Menu",
      MenuEnable: text(row, "MenuEnable", "enabled") || "1",
      imageSource: text(row, "ImageSource", "image_source") as PublicMenuGroup["imageSource"],
      presetKey: text(row, "PresetKey", "preset_key") ?? null,
      customImagePath: text(row, "GroupImagePath", "CustomImagePath", "custom_image_path") ?? null,
      updatedAt: text(row, "UpdatedAt", "updated_at") ?? null,
    }];
  });
}

export async function fetchPublicMenuItems(companyId: number, groupId: number): Promise<PublicProduct[]> {
  const rows = await publicData({ action: "menu", resource: "items", company_id: String(companyId), group_id: String(groupId) });
  return rows.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    const id = numberValue(row, "ID", "id");
    const group = numberValue(row, "GroupID", "group_id") ?? groupId;
    if (!id) return [];
    const gallery = Array.isArray(row.images) ? row.images.map((path) => String(path || "").trim()).filter(Boolean) : [];
    const legacyImage = text(row, "imagepath", "Imagepath", "ImagePath", "image_path");
    return [{
      ID: String(id),
      GroupID: String(group),
      OrderName: text(row, "OrderName", "name") || "Item",
      OrderPrice: text(row, "OrderPrice", "price"),
      OrderDesription: text(row, "OrderDesription", "description"),
      imagepath: legacyImage || gallery[0] || "",
      ImageSize: text(row, "ImageSize", "image_size"),
      MenuEnable: text(row, "MenuEnable", "enabled") || "1",
      images: gallery.length > 0 ? gallery : (legacyImage ? [legacyImage] : []),
      youtube_video_id: text(row, "youtube_video_id") || null,
    }];
  });
}

export function getPublicMenuGroupImageUrl(group: PublicMenuGroup): string | null {
  if (group.imageSource === "none") return null;
  if (group.imageSource === "custom" && group.customImagePath) {
    return getMenuImageUrl(group.customImagePath, group.updatedAt || undefined);
  }
  if (group.imageSource === "preset" && group.presetKey) {
    return presetSrc(group.presetKey);
  }
  return presetSrc(stableFallbackPresetKey(group.ID));
}

export function getPublicProductImageUrl(path?: string, cacheBust?: string | number): string {
  return getMenuImageUrl(path, cacheBust);
}
