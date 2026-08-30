import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchGlobalShops, fetchNearbyShops } from "@/lib/nearbyShops";

const localFree = { companyid: "1", companyname: "Local Free", companylat: "51.5", companylong: "-0.1", PublicNumber: "1" };
const localPaid = { companyid: "2", companyname: "Local Paid", companylat: "51.501", companylong: "-0.1", PublicNumber: "1" };
const localGlobal = { companyid: "3", companyname: "Local Global", companylat: "51.502", companylong: "-0.1", PublicNumber: "1" };
const distantGlobal = { companyid: "4", companyname: "Distant Global", companylat: "52", companylong: "-0.1", PublicNumber: "1" };

const response = (data: unknown[]) => new Response(JSON.stringify({ success: true, data }), { status: 200 });

describe("shop listing tier semantics", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("includes nearby Free and Paid results plus only physically-near Global shops in Free Shops", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response([localFree, localPaid]))
      .mockResolvedValueOnce(response([localGlobal, distantGlobal]));

    const shops = await fetchNearbyShops(51.5, -0.1);
    expect(shops).toHaveLength(3);
    expect(shops.map((shop) => shop.name)).toEqual(expect.arrayContaining(["Local Free", "Local Paid", "Local Global"]));
    expect(shops.map((shop) => shop.name)).not.toContain("Distant Global");
  });

  it("keeps Paid Shops on the paid one-mile request only", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response([localPaid]));
    await expect(fetchNearbyShops(51.5, -0.1, "paid")).resolves.toHaveLength(1);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain("tier=paid");
    expect(String(fetchMock.mock.calls[0][0])).toContain("radius=1");
  });

  it("keeps Global Shops as a worldwide Global-tier listing", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response([localGlobal, distantGlobal]));
    await expect(fetchGlobalShops()).resolves.toHaveLength(2);

    expect(String(fetchMock.mock.calls[0][0])).toContain("tier=global");
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("radius=");
  });
});
