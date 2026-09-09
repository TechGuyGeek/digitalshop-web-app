import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticatedFetch: vi.fn() }));

vi.mock("@/lib/authClient", () => ({
  API_ORIGIN: "https://stage-web.gpsshops.com",
  AuthApiError: class AuthApiError extends Error {
    constructor(public status: number, public code: string, message: string) { super(message); }
  },
  authenticatedFetch: mocks.authenticatedFetch,
}));

import {
  createMenuGroup,
  createProduct,
  deleteMenuGroup,
  deleteProduct,
  addProductImage,
  getMenuGroupUsage,
  getProductUsage,
  listMenuGroups,
  listProducts,
  ownerMenuApiUrls,
  renameMenuGroup,
  saveMenuGroupImage,
  removeProductImage,
  setPrimaryProductImage,
  toggleMenuGroup,
  toggleProduct,
  updateProduct,
} from "@/lib/menuApi";

function response(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });
}

function lastRequest() {
  const [url, init] = mocks.authenticatedFetch.mock.calls.at(-1) as [string, RequestInit | undefined];
  return { url, init: init || {}, body: JSON.parse(String(init?.body || "{}")) as Record<string, unknown> };
}

describe("canonical Web owner-menu contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticatedFetch.mockImplementation(() => Promise.resolve(response({ saved: true, id: 99 })));
  });

  it("lists canonical groups and normalizes their image metadata through the authenticated staging client", async () => {
    mocks.authenticatedFetch.mockResolvedValueOnce(response([{ ID: 9, OrderGroup: "Drinks", MenuEnable: "1", ImageSource: "custom", GroupImagePath: "/Images/company/GroupImages/2/drinks.jpg", UpdatedAt: "2026-08-26 00:00:00" }]));

    await expect(listMenuGroups(2)).resolves.toEqual([expect.objectContaining({ id: 9, name: "Drinks", enabled: true, image_source: "custom", custom_image_path: "/Images/company/GroupImages/2/drinks.jpg" })]);
    expect(lastRequest().url).toBe("https://stage-web.gpsshops.com/menu1/api/v1/owner-menu.php?company_id=2&resource=groups");
    expect(lastRequest().init.method).toBeUndefined();
  });

  it("uses canonical actions for every group write and its server-side deletion precheck", async () => {
    await createMenuGroup(2, "Food");
    expect(lastRequest().body).toMatchObject({ action: "add_group", company_id: 2, name: "Food" });
    await renameMenuGroup(2, "Food", "Fresh Food");
    expect(lastRequest().body).toMatchObject({ action: "rename_group", company_id: 2, old_name: "Food", name: "Fresh Food" });
    await toggleMenuGroup(2, 9, false);
    expect(lastRequest().body).toMatchObject({ action: "toggle_group", company_id: 2, group_id: 9, enabled: false });
    await saveMenuGroupImage(2, 9, { image_source: "preset", preset_key: "food" });
    expect(lastRequest().body).toMatchObject({ action: "save_group_image", company_id: 2, group_id: 9, image_source: "preset", preset_key: "food" });
    mocks.authenticatedFetch.mockResolvedValueOnce(response({ group_id: 9, safe_to_delete: false, product_count: 1, order_reference_count: 0 }));
    await expect(getMenuGroupUsage(2, 9)).resolves.toMatchObject({ safe_to_delete: false, product_count: 1 });
    expect(lastRequest().body).toMatchObject({ action: "group_usage", company_id: 2, group_id: 9 });
    await deleteMenuGroup(2, 9);
    expect(lastRequest().body).toMatchObject({ action: "delete_group", company_id: 2, group_id: 9 });
  });

  it("uses canonical actions for product list, writes, and server-side order-reference precheck", async () => {
    mocks.authenticatedFetch.mockResolvedValueOnce(response([{ ID: 4, GroupID: 9, OrderName: "Tea", OrderDesription: "Hot", OrderPrice: "2.50", MenuEnable: "1", images: ["/Images/company/CompanyMenu/2/tea.jpeg", "/Images/company/CompanyMenu/2/tea-2.jpeg"], youtube_video_id: "M7lc1UVf-VE", ImageSize: 1 }]));
    await expect(listProducts(2, 9)).resolves.toEqual([expect.objectContaining({ id: 4, group_id: 9, name: "Tea", image_path: "/Images/company/CompanyMenu/2/tea.jpeg", images: ["/Images/company/CompanyMenu/2/tea.jpeg", "/Images/company/CompanyMenu/2/tea-2.jpeg"], youtube_video_id: "M7lc1UVf-VE" })]);
    expect(lastRequest().url).toBe("https://stage-web.gpsshops.com/menu1/api/v1/owner-menu.php?company_id=2&resource=products&group_id=9");
    await createProduct(2, { group_id: 9, name: "Coffee", description: "Black", price: "3.00", image_base64: "image" });
    expect(lastRequest().body).toMatchObject({ action: "add_item", company_id: 2, group_id: 9, name: "Coffee" });
    await updateProduct(2, 4, { name: "Tea", description: "Green", price: "2.75" });
    expect(lastRequest().body).toMatchObject({ action: "update_item", company_id: 2, item_id: 4, description: "Green" });
    await toggleProduct(2, 4, false);
    expect(lastRequest().body).toMatchObject({ action: "toggle_item", company_id: 2, item_id: 4, enabled: false });
    mocks.authenticatedFetch.mockResolvedValueOnce(response({ item_id: 4, reference_count: 3 }));
    await expect(getProductUsage(2, 4)).resolves.toEqual({ item_id: 4, reference_count: 3 });
    expect(lastRequest().body).toMatchObject({ action: "item_usage", company_id: 2, item_id: 4 });
    await deleteProduct(2, 4);
    expect(lastRequest().body).toMatchObject({ action: "delete_item", company_id: 2, item_id: 4 });
  });

  it("uses server-enforced canonical actions for gallery image changes", async () => {
    mocks.authenticatedFetch.mockResolvedValueOnce(response({ images: ["/one.jpg", "/two.jpg"] }));
    await addProductImage(2, 4, "encoded-image");
    expect(lastRequest().body).toEqual({ action: "add_product_image", company_id: 2, item_id: 4, image_base64: "encoded-image" });

    mocks.authenticatedFetch.mockResolvedValueOnce(response({ images: ["/two.jpg"] }));
    await removeProductImage(2, 4, "/one.jpg");
    expect(lastRequest().body).toEqual({ action: "remove_product_image", company_id: 2, item_id: 4, image_path: "/one.jpg" });

    mocks.authenticatedFetch.mockResolvedValueOnce(response({ images: ["/two.jpg", "/one.jpg"] }));
    await setPrimaryProductImage(2, 4, "/two.jpg");
    expect(lastRequest().body).toEqual({ action: "set_primary_product_image", company_id: 2, item_id: 4, image_path: "/two.jpg" });
  });

  it("has one staging-aware owner-menu endpoint and no production resource endpoint", () => {
    expect(ownerMenuApiUrls.OWNER_MENU_URL).toBe("https://stage-web.gpsshops.com/menu1/api/v1/owner-menu.php");
    expect(ownerMenuApiUrls.OWNER_MENU_URL).not.toContain("menu-groups.php");
    expect(ownerMenuApiUrls.OWNER_MENU_URL).not.toContain("products.php");
  });
});
