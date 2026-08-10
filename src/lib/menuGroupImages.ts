import { SERVER_DOMAIN } from "@/lib/companyApi";

import foodPreset from "@/assets/menu-group-presets/food.jpg";
import drinksPreset from "@/assets/menu-group-presets/drinks.jpg";
import dessertsPreset from "@/assets/menu-group-presets/desserts.jpg";
import toysPreset from "@/assets/menu-group-presets/toys.jpg";
import clothingPreset from "@/assets/menu-group-presets/clothing.jpg";
import electronicsPreset from "@/assets/menu-group-presets/electronics.jpg";
import beautyPreset from "@/assets/menu-group-presets/beauty.jpg";
import servicesPreset from "@/assets/menu-group-presets/services.jpg";

export type PresetKey =
  | "food"
  | "drinks"
  | "desserts"
  | "toys"
  | "clothing"
  | "electronics"
  | "beauty"
  | "services";

/** Central preset mapping — swap an artwork file here without touching components. */
export const MENU_GROUP_PRESETS: { key: PresetKey; src: string; labelKey: string }[] = [
  { key: "food", src: foodPreset, labelKey: "GroupImagePresetFood" },
  { key: "drinks", src: drinksPreset, labelKey: "GroupImagePresetDrinks" },
  { key: "desserts", src: dessertsPreset, labelKey: "GroupImagePresetDesserts" },
  { key: "toys", src: toysPreset, labelKey: "GroupImagePresetToys" },
  { key: "clothing", src: clothingPreset, labelKey: "GroupImagePresetClothing" },
  { key: "electronics", src: electronicsPreset, labelKey: "GroupImagePresetElectronics" },
  { key: "beauty", src: beautyPreset, labelKey: "GroupImagePresetBeauty" },
  { key: "services", src: servicesPreset, labelKey: "GroupImagePresetServices" },
];

const PRESET_SRC: Record<string, string> = Object.fromEntries(
  MENU_GROUP_PRESETS.map((p) => [p.key, p.src])
);

export interface MenuGroupImage {
  groupId: string;
  imageSource: "preset" | "custom" | "none";
  presetKey?: string | null;
  customImagePath?: string | null;
  updatedAt?: string | null;
}

/** groupId (as string) -> metadata */
export type MenuGroupImageMap = Record<string, MenuGroupImage>;

const IMAGE_BASE = SERVER_DOMAIN + "menu1";

function resolveCustomPath(path: string, updatedAt?: string | null): string {
  const clean = path.startsWith("http")
    ? path
    : IMAGE_BASE + (path.startsWith("/") ? path : "/" + path);
  if (!updatedAt) return clean;
  const token = encodeURIComponent(String(updatedAt));
  return clean + (clean.includes("?") ? "&" : "?") + "v=" + token;
}

/** Returns a displayable URL for a group's banner, or null when there is none. */
export function resolveMenuGroupImageUrl(meta?: MenuGroupImage | null): string | null {
  if (!meta) return null;
  if (meta.imageSource === "preset" && meta.presetKey) {
    return PRESET_SRC[meta.presetKey] ?? null;
  }
  if (meta.imageSource === "custom" && meta.customImagePath) {
    return resolveCustomPath(meta.customImagePath, meta.updatedAt);
  }
  return null;
}

export function presetSrc(key: string): string | null {
  return PRESET_SRC[key] ?? null;
}

/**
 * One request per company (never per group). Never throws — falls back to an
 * empty map so menus keep working when the endpoint is unavailable.
 */
export async function fetchMenuGroupImages(companyId: string | number): Promise<MenuGroupImageMap> {
  try {
    const form = new URLSearchParams();
    form.append("companyID", String(companyId));
    const res = await fetch(SERVER_DOMAIN + "menu1/PHPread/CompanyMenu/GetMenuGroupImages.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const text = await res.text();
    if (!text) return {};
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {};
    }
    if (!Array.isArray(parsed)) return {};
    const map: MenuGroupImageMap = {};
    for (const row of parsed as Record<string, unknown>[]) {
      if (!row || typeof row !== "object") continue;
      const groupId = String(row.GroupID ?? row.groupID ?? row.groupid ?? "").trim();
      if (!groupId) continue;
      const rawSource = String(row.ImageSource ?? row.imageSource ?? "none").toLowerCase();
      const imageSource: MenuGroupImage["imageSource"] =
        rawSource === "preset" || rawSource === "custom" ? rawSource : "none";
      map[groupId] = {
        groupId,
        imageSource,
        presetKey: (row.PresetKey ?? row.presetKey ?? null) as string | null,
        customImagePath: (row.CustomImagePath ?? row.customImagePath ?? null) as string | null,
        updatedAt: (row.UpdatedAt ?? row.updatedAt ?? null) as string | null,
      };
    }
    return map;
  } catch {
    return {};
  }
}

export interface SaveGroupImageAuth {
  userId: number | string;
  email: string;
  password: string;
}

export type SaveGroupImagePayload =
  | { imageSource: "preset"; presetKey: PresetKey }
  | { imageSource: "custom"; imageBase64: string }
  | { imageSource: "none" };

export async function saveMenuGroupImage(
  auth: SaveGroupImageAuth,
  companyId: string | number,
  groupId: string | number,
  payload: SaveGroupImagePayload
): Promise<{ success: boolean; message?: string }> {
  const body: Record<string, unknown> = {
    UserID: String(auth.userId),
    UserEmail: auth.email,
    UserPassword: auth.password,
    companyID: Number(companyId),
    GroupID: Number(groupId),
    ImageSource: payload.imageSource,
  };
  if (payload.imageSource === "preset") body.PresetKey = payload.presetKey;
  if (payload.imageSource === "custom") body.ImageBase64 = payload.imageBase64;

  try {
    const res = await fetch(SERVER_DOMAIN + "menu1/PHPwrite/CompanyMenu/SaveMenuGroupImageSecure.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      const ok =
        data.success === true ||
        data.Success === true ||
        String(data.success ?? "").toLowerCase() === "true" ||
        String(data.Result ?? "").toLowerCase() === "true" ||
        String(data.ServerMessage ?? data.Message ?? "").toLowerCase().includes("saved");
      return { success: ok, message: data.ServerMessage || data.Message || data.error || text };
    } catch {
      const lower = text.trim().toLowerCase();
      return { success: lower.includes("saved") || lower === "true", message: text };
    }
  } catch {
    return { success: false, message: "Network error" };
  }
}