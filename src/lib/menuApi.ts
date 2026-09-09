import { API_ORIGIN, AuthApiError, authenticatedFetch } from "@/lib/authClient";

const OWNER_MENU_URL = `${API_ORIGIN}/menu1/api/v1/owner-menu.php`;

export interface MenuGroupV1 { id: number; name: string; enabled: boolean; image_source: "preset" | "custom" | "none"; preset_key: string | null; custom_image_path: string | null; updated_at: string | null; }
export interface ProductV1 { id: number; group_id: number; name: string; description: string; price: string; enabled: boolean; image_path: string | null; image_size: number; images: string[]; youtube_video_id: string | null; }
export interface MenuGroupUsage { group_id: number; safe_to_delete: boolean; product_count: number; order_reference_count: number; }
export interface ProductUsage { item_id: number; reference_count: number; }

type OwnerMenuRow = Record<string, unknown>;

async function read<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) throw new AuthApiError(response.status, body?.error?.code || "menu_request_failed", body?.error?.message || "Menu request failed.");
  return body.data as T;
}

function numberValue(value: unknown): number { const number = Number(value); return Number.isFinite(number) ? number : 0; }
function stringValue(value: unknown): string { return typeof value === "string" ? value : value == null ? "" : String(value); }

function imagePaths(row: OwnerMenuRow): string[] {
  const values = Array.isArray(row.images) ? row.images : [];
  const paths = values.map((value) => stringValue(value)).filter(Boolean);
  if (paths.length > 0) return paths;
  const legacy = stringValue(row.imagepath ?? row.image_path);
  return legacy ? [legacy] : [];
}

function menuGroupFromOwnerMenu(row: OwnerMenuRow): MenuGroupV1 {
  const source = stringValue(row.ImageSource ?? row.image_source).toLowerCase();
  return {
    id: numberValue(row.ID ?? row.id), name: stringValue(row.OrderGroup ?? row.name),
    enabled: stringValue(row.MenuEnable ?? row.menuGroupEnabled ?? row.enabled) === "1" || row.enabled === true,
    image_source: source === "preset" || source === "custom" || source === "none" ? source : "none",
    preset_key: stringValue(row.PresetKey ?? row.preset_key) || null,
    custom_image_path: stringValue(row.GroupImagePath ?? row.CustomImagePath ?? row.custom_image_path) || null,
    updated_at: stringValue(row.UpdatedAt ?? row.updated_at) || null,
  };
}

function productFromOwnerMenu(row: OwnerMenuRow): ProductV1 {
  const images = imagePaths(row);
  return {
    id: numberValue(row.ID ?? row.id), group_id: numberValue(row.GroupID ?? row.group_id),
    name: stringValue(row.OrderName ?? row.name), description: stringValue(row.OrderDesription ?? row.description), price: stringValue(row.OrderPrice ?? row.price),
    enabled: stringValue(row.MenuEnable ?? row.MenuItemEnable ?? row.enabled) === "1" || row.enabled === true,
    image_path: images[0] || null, image_size: numberValue(row.ImageSize ?? row.image_size), images,
    youtube_video_id: stringValue(row.youtube_video_id) || null,
  };
}

async function ownerMenuWrite<T>(companyId: number, action: string, input: Record<string, unknown> = {}): Promise<T> {
  return read<T>(await authenticatedFetch(OWNER_MENU_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, company_id: companyId, ...input }) }));
}

export async function listMenuGroups(companyId: number): Promise<MenuGroupV1[]> {
  const query = new URLSearchParams({ company_id: String(companyId), resource: "groups" });
  return (await read<OwnerMenuRow[]>(await authenticatedFetch(`${OWNER_MENU_URL}?${query.toString()}`))).map(menuGroupFromOwnerMenu);
}
export async function createMenuGroup(companyId: number, name: string): Promise<{ id: number }> { return ownerMenuWrite(companyId, "add_group", { name }); }
export async function renameMenuGroup(companyId: number, oldName: string, name: string): Promise<void> { await ownerMenuWrite(companyId, "rename_group", { old_name: oldName, name }); }
export async function toggleMenuGroup(companyId: number, groupId: number, enabled: boolean): Promise<void> { await ownerMenuWrite(companyId, "toggle_group", { group_id: groupId, enabled }); }
export async function saveMenuGroupImage(companyId: number, groupId: number, input: { image_source: "preset" | "custom" | "none"; preset_key?: string; image_base64?: string; }): Promise<void> { await ownerMenuWrite(companyId, "save_group_image", { group_id: groupId, ...input }); }
export async function getMenuGroupUsage(companyId: number, groupId: number): Promise<MenuGroupUsage> { return ownerMenuWrite(companyId, "group_usage", { group_id: groupId }); }
export async function deleteMenuGroup(companyId: number, groupId: number): Promise<void> { await ownerMenuWrite(companyId, "delete_group", { group_id: groupId }); }

export async function listProducts(companyId: number, groupId: number): Promise<ProductV1[]> {
  const query = new URLSearchParams({ company_id: String(companyId), resource: "products", group_id: String(groupId) });
  return (await read<OwnerMenuRow[]>(await authenticatedFetch(`${OWNER_MENU_URL}?${query.toString()}`))).map(productFromOwnerMenu);
}
export async function createProduct(companyId: number, input: { group_id: number; name: string; description: string; price: string; image_base64?: string; youtube_video_url?: string; }): Promise<{ id: number }> { return ownerMenuWrite(companyId, "add_item", input); }
export async function updateProduct(companyId: number, itemId: number, input: { name: string; description: string; price: string; image_base64?: string; youtube_video_url?: string; }): Promise<void> { await ownerMenuWrite(companyId, "update_item", { item_id: itemId, ...input }); }
export async function addProductImage(companyId: number, itemId: number, imageBase64: string): Promise<{ images: string[] }> { return ownerMenuWrite(companyId, "add_product_image", { item_id: itemId, image_base64: imageBase64 }); }
export async function removeProductImage(companyId: number, itemId: number, imagePath: string): Promise<{ images: string[] }> { return ownerMenuWrite(companyId, "remove_product_image", { item_id: itemId, image_path: imagePath }); }
export async function setPrimaryProductImage(companyId: number, itemId: number, imagePath: string): Promise<{ images: string[] }> { return ownerMenuWrite(companyId, "set_primary_product_image", { item_id: itemId, image_path: imagePath }); }
export async function toggleProduct(companyId: number, itemId: number, enabled: boolean): Promise<void> { await ownerMenuWrite(companyId, "toggle_item", { item_id: itemId, enabled }); }
export async function getProductUsage(companyId: number, itemId: number): Promise<ProductUsage> { return ownerMenuWrite(companyId, "item_usage", { item_id: itemId }); }
export async function deleteProduct(companyId: number, itemId: number): Promise<void> { await ownerMenuWrite(companyId, "delete_item", { item_id: itemId }); }

export function asLegacyGroup(group: MenuGroupV1) { return { ID: String(group.id), OrderGroup: group.name, companyid: 0, MenuEnable: group.enabled ? "1" : "0", menuGroupEnabled: group.enabled ? "1" : "0" }; }
export function asLegacyProduct(product: ProductV1) { return { ID: String(product.id), GroupID: String(product.group_id), OrderName: product.name, OrderDesription: product.description, OrderPrice: product.price, imagepath: product.image_path || "", images: product.images, youtube_video_id: product.youtube_video_id, ImageSize: String(product.image_size || 0), MenuEnable: product.enabled ? "1" : "0", MenuItemEnable: product.enabled ? "1" : "0" }; }
export const ownerMenuApiUrls = { OWNER_MENU_URL };
