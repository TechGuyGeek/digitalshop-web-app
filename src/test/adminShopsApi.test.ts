import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticatedFetch: vi.fn() }));

vi.mock("@/lib/authClient", () => ({
  API_ORIGIN: "https://stage-web.gpsshops.com",
  AuthApiError: class AuthApiError extends Error {
    constructor(public status: number, public code: string, message: string) { super(message); }
  },
  authenticatedFetch: mocks.authenticatedFetch,
}));

import { ADMIN_SHOPS_URL, fetchAdminShops } from "@/lib/adminShopsApi";

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: status < 400, data, error: status < 400 ? undefined : { code: "admin_forbidden", message: "Administrator access is required." } }), { status, headers: { "Content-Type": "application/json" } });
}

describe("canonical Admin shops V1 contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the authenticated staging admin-shops endpoint without any tier or radius filter", async () => {
    mocks.authenticatedFetch.mockResolvedValueOnce(response([{ companyid: 7, companyname: "Admin Cafe", companylat: 51.5, companylong: -0.1, PublicNumber: 3 }]));

    await expect(fetchAdminShops({ lat: 51.5, lng: -0.1 })).resolves.toEqual([expect.objectContaining({ companyid: 7, distance: 0 })]);
    expect(ADMIN_SHOPS_URL).toBe("https://stage-web.gpsshops.com/menu1/api/v1/admin-shops.php");
    expect(mocks.authenticatedFetch).toHaveBeenCalledWith(ADMIN_SHOPS_URL);
  });

  it("filters invalid and 0,0 coordinates while keeping all valid canonical shops", async () => {
    mocks.authenticatedFetch.mockResolvedValueOnce(response([
      { companyid: 1, companyname: "Valid", companylat: 51.5, companylong: -0.1, PublicNumber: 1 },
      { companyid: 2, companyname: "Zero", companylat: 0, companylong: 0, PublicNumber: 2 },
      { companyid: 3, companyname: "Invalid", companylat: 91, companylong: 0, PublicNumber: 3 },
    ]));

    await expect(fetchAdminShops(null)).resolves.toEqual([expect.objectContaining({ companyid: 1, distance: null })]);
  });

  it("propagates canonical admin_forbidden and has no public/global fallback", async () => {
    mocks.authenticatedFetch.mockResolvedValueOnce(response(null, 403));

    await expect(fetchAdminShops()).rejects.toMatchObject({ status: 403, code: "admin_forbidden" });
    expect(mocks.authenticatedFetch).toHaveBeenCalledTimes(1);
  });
});
