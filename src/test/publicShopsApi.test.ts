import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FREE_PAID_RADIUS_MILES,
  MENU_GROUP_ASPECT_RATIO,
  PRODUCT_IMAGE_ASPECT_RATIO,
  PUBLIC_SHOPS_URL,
  fetchPublicGlobalShops,
  fetchPublicMenuGroups,
  fetchPublicMenuItems,
  fetchPublicNearbyShops,
  fetchPublicShopDetail,
  getPublicMenuGroupImageUrl,
  getPublicProductImageUrl,
} from "@/lib/publicShopsApi";
import { formatDistanceMiles, haversineMiles, isValidCoordinate } from "@/lib/geo";

function envelope(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });
}

const shop = {
  companyid: "42",
  companyname: "Canonical Cafe",
  companylat: "51.5000",
  companylong: "-0.1000",
  PublicNumber: "3",
  companyphoto: "/Images/company/cafe.jpg",
  CompanyDescription: "Canonical description",
};

describe("canonical public discovery and menu V1 contracts", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("uses the exact Free canonical request and one-mile client distance", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(envelope([shop, { ...shop, companyid: "0", companylat: "0", companylong: "0" }]));
    const shops = await fetchPublicNearbyShops(51.5, -0.1, "free");
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/menu1/api/v1/public-shops.php");
    expect(url.searchParams.get("tier")).toBe("free");
    expect(url.searchParams.get("lat")).toBe("51.5");
    expect(url.searchParams.get("lon")).toBe("-0.1");
    expect(url.searchParams.get("radius")).toBe(String(FREE_PAID_RADIUS_MILES));
    expect(shops).toHaveLength(1);
    expect(shops[0].distance).toBe(0);
  });

  it("uses the exact Paid canonical request and one-mile radius", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(envelope([shop]));
    await fetchPublicNearbyShops(52, -1, "paid");
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("tier")).toBe("paid");
    expect(url.searchParams.get("radius")).toBe("1");
  });

  it("uses Global without radius filtering and omits distance without geolocation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(envelope([shop]));
    const shops = await fetchPublicGlobalShops();
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.toString()).toBe(`${PUBLIC_SHOPS_URL}?tier=global`);
    expect(url.searchParams.has("radius")).toBe(false);
    expect(shops[0].distance).toBeNull();
  });

  it("calculates global distance when browser geolocation is available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(envelope([shop]));
    const shops = await fetchPublicGlobalShops({ lat: 51.5, lng: -0.1 });
    expect(shops[0].distance).toBe(0);
  });

  it("uses canonical shop detail, groups, and products actions", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(envelope({ ...shop, OpeningTimes: "08:00", ClosingTimes: "18:00" }))
      .mockResolvedValueOnce(envelope([{ ID: 7, OrderGroup: "Food", MenuEnable: "1", ImageSource: "custom", GroupImagePath: "/Images/groups/7.jpg", UpdatedAt: "token-7" }]))
      .mockResolvedValueOnce(envelope([{ ID: 8, GroupID: 7, OrderName: "Soup", OrderPrice: "4.50", OrderDesription: "Hot", imagepath: "/Images/products/8.jpg", MenuEnable: "1" }]));
    await fetchPublicShopDetail(42);
    await fetchPublicMenuGroups(42);
    await fetchPublicMenuItems(42, 7);
    const detailUrl = new URL(String(fetchMock.mock.calls[0][0]));
    const groupsUrl = new URL(String(fetchMock.mock.calls[1][0]));
    const itemsUrl = new URL(String(fetchMock.mock.calls[2][0]));
    expect(detailUrl.searchParams.toString()).toContain("action=detail");
    expect(detailUrl.searchParams.get("company_id")).toBe("42");
    expect(groupsUrl.searchParams.get("resource")).toBe("groups");
    expect(itemsUrl.searchParams.get("resource")).toBe("items");
    expect(itemsUrl.searchParams.get("group_id")).toBe("7");
  });

  it("uses 3:1 groups, 16:9 products, and the image proxy", async () => {
    const groupUrl = getPublicMenuGroupImageUrl({ ID: "7", OrderGroup: "Food", MenuEnable: "1", imageSource: "custom", customImagePath: "/Images/groups/7.jpg", updatedAt: "token-7" });
    const productUrl = new URL(getPublicProductImageUrl("/Images/products/8.jpg", "8"));
    expect(MENU_GROUP_ASPECT_RATIO).toBe("3/1");
    expect(PRODUCT_IMAGE_ASPECT_RATIO).toBe("16/9");
    expect(groupUrl).toBeTruthy();
    expect(groupUrl).not.toContain("/menu1/Images/");
    expect(new URL(groupUrl!).searchParams.get("path")).toBe("/Images/groups/7.jpg");
    expect(new URL(groupUrl!).searchParams.get("v")).toBe("token-7");
    expect(productUrl.pathname).toBe("/menu1/api/v1/menu-image.php");
    expect(productUrl.searchParams.get("path")).toBe("/Images/products/8.jpg");
  });

  it("shares Haversine, formatting, and invalid-coordinate behavior", () => {
    expect(haversineMiles({ lat: 51.5, lng: -0.1 }, { lat: 51.5, lng: -0.1 })).toBe(0);
    expect(formatDistanceMiles(0.389)).toBe("0.39 mi");
    expect(formatDistanceMiles(null)).toBeNull();
    expect(isValidCoordinate({ lat: 51.5, lng: -0.1 })).toBe(true);
    expect(isValidCoordinate({ lat: 0, lng: 0 })).toBe(false);
    expect(isValidCoordinate({ lat: 91, lng: 0 })).toBe(false);
  });

  it("keeps no-geolocation global browsing valid without a distance", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(envelope([shop]));
    await expect(fetchPublicGlobalShops(null)).resolves.toHaveLength(1);
  });
});
