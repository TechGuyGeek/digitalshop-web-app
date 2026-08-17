import { AuthApiError, authenticatedFetch } from "@/lib/authClient";

const API_ORIGIN = "https://web.gpsshops.com";
const GROUPS_URL = `${API_ORIGIN}/menu1/api/v1/menu-groups.php`;
const PRODUCTS_URL = `${API_ORIGIN}/menu1/api/v1/products.php`;

export interface MenuGroupV1 { id: number; name: string; enabled: boolean; image_source: "preset" | "custom" | "none"; preset_key: string | null; custom_image_path: string | null; updated_at: string | null; }
export interface ProductV1 { id: number; group_id: number; name: string; description: string; price: string; enabled: boolean; image_path: string | null; image_size: number; }

async function read<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) throw new AuthApiError(response.status, body?.error?.code || "menu_request_failed", body?.error?.message || "Menu request failed.");
  return body.data as T;
}
export async function listMenuGroups() { return (await read<{ groups: MenuGroupV1[] }>(await authenticatedFetch(GROUPS_URL))).groups; }
export async function createMenuGroup(name: string) { return (await read<{ group: MenuGroupV1 }>(await authenticatedFetch(GROUPS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }))).group; }
export async function updateMenuGroup(id: number, input: Record<string, unknown>) { return (await read<{ group: MenuGroupV1 }>(await authenticatedFetch(`${GROUPS_URL}?id=${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }))).group; }
export async function deleteMenuGroup(id: number) { return read<{ deleted: boolean }>(await authenticatedFetch(`${GROUPS_URL}?id=${encodeURIComponent(id)}`, { method: "DELETE" })); }
export async function listProducts(groupId: number) { return (await read<{ products: ProductV1[] }>(await authenticatedFetch(`${PRODUCTS_URL}?group_id=${encodeURIComponent(groupId)}`))).products; }
export async function createProduct(input: Record<string, unknown>) { return (await read<{ product: ProductV1 }>(await authenticatedFetch(PRODUCTS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }))).product; }
export async function updateProduct(id: number, input: Record<string, unknown>) { return (await read<{ product: ProductV1 }>(await authenticatedFetch(`${PRODUCTS_URL}?id=${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }))).product; }
export async function deleteProduct(id: number) { return read<{ deleted: boolean }>(await authenticatedFetch(`${PRODUCTS_URL}?id=${encodeURIComponent(id)}`, { method: "DELETE" })); }

export function asLegacyGroup(group: MenuGroupV1) { return { ID: String(group.id), OrderGroup: group.name, companyid: 0, MenuEnable: group.enabled ? "1" : "0", menuGroupEnabled: group.enabled ? "1" : "0" }; }
export function asLegacyProduct(product: ProductV1) { return { ID: String(product.id), GroupID: String(product.group_id), OrderName: product.name, OrderDesription: product.description, OrderPrice: product.price, imagepath: product.image_path || "", ImageSize: String(product.image_size || 0), MenuEnable: product.enabled ? "1" : "0", MenuItemEnable: product.enabled ? "1" : "0" }; }
