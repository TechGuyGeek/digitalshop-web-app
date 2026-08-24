import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteProfile,
  getMenuImageUrl,
  getProfile,
  getProfileDeletionStatus,
  clearInMemoryAccessToken,
  login,
  updateProfile,
} from "@/lib/authClient";
import {
  COMPANY_V1_URL,
  createOwnedCompany,
  deleteOwnedCompany,
  getOwnedCompany,
  getOwnedCompanyDeletionStatus,
  updateOwnedCompany,
} from "@/lib/companyApi";

const user = {
  id: 42,
  email: "person@example.test",
  first_name: "Person",
  last_name: "Example",
  mobile_number: "123",
  locale: "en-GB",
  email_verified: true,
  paid_user: "2",
  gender: "Female",
  image_path: "/Images/UserProfile/user_42.jpg",
  line_one_address: "One",
  line_two_address: "Two",
  line_three_address: "Three",
  line_four_address: "Four",
  line_country_address: "GB",
  delivery_notes: "Leave at door",
};

const company = {
  id: 7,
  name: "Canonical Shop",
  mobile_number: "456",
  company_email: "shop@example.test",
  image_path: "/Images/company/v1/company_7.jpg",
  latitude: 53.3,
  longitude: -6.2,
  opening_time: "08:00",
  closing_time: "18:00",
  table_numbers: "12",
  notifications_enabled: true,
  orders_enabled: true,
  takeaway_enabled: false,
  delivery_enabled: true,
  global_enabled: false,
  map_marker: 1,
  payment_method: 0,
  stripe_enabled: false,
  line_one_address: "One",
  line_two_address: "Two",
  line_three_address: "Three",
  line_four_address: "Four",
  country: "GB",
  description: "Description",
};

function envelope(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(status >= 400
    ? { success: false, error: { code: "request_failed", message: "failed" } }
    : { success: true, data }), { status, headers: { "Content-Type": "application/json" } });
}

async function authenticatedFetchMock() {
  const fetchMock = vi.spyOn(globalThis, "fetch");
  fetchMock
    .mockResolvedValueOnce(envelope({ token_type: "Bearer", access_token: "access-1", access_expires_at: "2099-01-01T00:00:00Z", refresh_via_cookie: true, user }))
    .mockResolvedValueOnce(envelope({ user }));
  await login(user.email, "correct horse battery staple");
  return fetchMock;
}

describe("canonical profile and company V1 contracts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearInMemoryAccessToken();
  });

  it("maps profile GET/PATCH fields without identity or credential authority", async () => {
    const fetchMock = await authenticatedFetchMock();
    fetchMock.mockResolvedValueOnce(envelope({ user }));
    expect(await getProfile()).toEqual(user);

    fetchMock.mockResolvedValueOnce(envelope({ user: { ...user, first_name: "Updated" } }));
    await updateProfile({
      first_name: "Updated", last_name: user.last_name, gender: user.gender, mobile_number: user.mobile_number,
      line_one_address: user.line_one_address, line_two_address: user.line_two_address,
      line_three_address: user.line_three_address, line_four_address: user.line_four_address,
      line_country_address: user.line_country_address, delivery_notes: user.delivery_notes,
    });

    expect(String(fetchMock.mock.calls[2][0])).toBe(`${COMPANY_V1_URL.replace("/company.php", "/profile.php")}`);
    const payload = JSON.parse(String((fetchMock.mock.calls[3][1] as RequestInit).body));
    expect(payload).toMatchObject({ first_name: "Updated", delivery_notes: "Leave at door" });
    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("password");
    expect(payload).not.toHaveProperty("PersonID");
  });

  it("uses the profile deletion status, fails closed on malformed status, and sends bodyless DELETE", async () => {
    const fetchMock = await authenticatedFetchMock();
    fetchMock.mockResolvedValueOnce(envelope({ safe_to_delete: true, owns_company: false, company_count: 0, outstanding_order_count: 0, order_history_count: 3 }));
    await expect(getProfileDeletionStatus()).resolves.toMatchObject({ safe_to_delete: true, order_history_count: 3 });
    expect(String(fetchMock.mock.calls[2][0])).toContain("profile.php?action=deletion_status");

    fetchMock.mockResolvedValueOnce(envelope({ safe_to_delete: true }));
    await expect(getProfileDeletionStatus()).rejects.toMatchObject({ code: "invalid_deletion_status" });

    fetchMock.mockResolvedValueOnce(envelope({ deleted: true }));
    await deleteProfile();
    const request = fetchMock.mock.calls.at(-1)?.[1] as RequestInit;
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe(COMPANY_V1_URL.replace("/company.php", "/profile.php"));
    expect(request.method).toBe("DELETE");
    expect(request.body).toBeUndefined();
  });

  it("uses the image proxy while preserving the path query and cache bust", () => {
    const url = new URL(getMenuImageUrl("/Images/UserProfile/user_42.jpg", "revision-1"));
    expect(url.pathname).toBe("/menu1/api/v1/menu-image.php");
    expect(url.searchParams.get("path")).toBe("/Images/UserProfile/user_42.jpg");
    expect(url.searchParams.get("v")).toBe("revision-1");
    expect(url.toString()).not.toContain("/menu1/Images/");
  });

  it("supports no-company, create, and canonical PATCH without identity fields", async () => {
    const fetchMock = await authenticatedFetchMock();
    fetchMock.mockResolvedValueOnce(envelope({ company: null }));
    await expect(getOwnedCompany()).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(envelope({ company }, 201));
    await createOwnedCompany({ name: company.name, company_email: company.company_email, latitude: company.latitude, longitude: company.longitude });
    const createPayload = JSON.parse(String((fetchMock.mock.calls.at(-1)?.[1] as RequestInit).body));
    expect(createPayload).toEqual({ name: company.name, company_email: company.company_email, latitude: company.latitude, longitude: company.longitude });
    expect(createPayload).not.toHaveProperty("PersonID");
    expect(createPayload).not.toHaveProperty("password");

    fetchMock.mockResolvedValueOnce(envelope({ company }));
    await updateOwnedCompany({
      name: company.name, mobile_number: company.mobile_number, company_email: company.company_email,
      latitude: company.latitude, longitude: company.longitude, opening_time: company.opening_time, closing_time: company.closing_time,
      table_numbers: company.table_numbers, notifications_enabled: true, orders_enabled: true,
      takeaway_enabled: false, delivery_enabled: true, global_enabled: false, map_marker: company.map_marker,
      payment_method: company.payment_method, line_one_address: company.line_one_address, line_two_address: company.line_two_address,
      line_three_address: company.line_three_address, line_four_address: company.line_four_address,
      country: company.country, description: company.description, image_base64: "encoded-image",
    });
    const patchPayload = JSON.parse(String((fetchMock.mock.calls.at(-1)?.[1] as RequestInit).body));
    expect(patchPayload).toMatchObject({ image_base64: "encoded-image", global_enabled: false, map_marker: 1 });
    expect(patchPayload).not.toHaveProperty("companyid");
    expect(patchPayload).not.toHaveProperty("UserID");
  });

  it("uses company deletion blockers and the exact DELETE {} contract", async () => {
    const fetchMock = await authenticatedFetchMock();
    fetchMock.mockResolvedValueOnce(envelope({ safe_to_delete: false, blockers: { products: 1, menu_groups: 0, orders_today: 0, orders_week: 0, orders_month: 0 } }));
    await expect(getOwnedCompanyDeletionStatus()).resolves.toMatchObject({ safe_to_delete: false });
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("company.php?action=deletion_status");

    fetchMock.mockResolvedValueOnce(envelope({ deleted: true }));
    await deleteOwnedCompany();
    const request = fetchMock.mock.calls.at(-1)?.[1] as RequestInit;
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe(COMPANY_V1_URL);
    expect(request.method).toBe("DELETE");
    expect(request.body).toBe("{}");
    expect(new Headers(request.headers).get("Content-Type")).toBe("application/json");
  });

  it("fails closed for malformed company deletion status", async () => {
    const fetchMock = await authenticatedFetchMock();
    fetchMock.mockResolvedValueOnce(envelope({ safe_to_delete: true, blockers: { products: "unknown" } }));
    await expect(getOwnedCompanyDeletionStatus()).rejects.toMatchObject({ code: "invalid_deletion_status" });

    fetchMock.mockResolvedValueOnce(envelope({ safe_to_delete: true, blockers: { products: 0 } }));
    await expect(getOwnedCompanyDeletionStatus()).rejects.toMatchObject({ code: "invalid_deletion_status" });
  });
});
