import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticatedFetch,
  authApiUrls,
  clearInMemoryAccessToken,
  login,
  logout,
  register,
  requestPasswordReset,
  resendVerification,
  restoreSession,
  verifyEmail,
} from "@/lib/authClient";
import { WEB_CLIENT, WEB_VERSION } from "@/lib/buildInfo";

const user = {
  id: 42,
  email: "person@example.test",
  first_name: "Person",
  last_name: "Example",
  mobile_number: "",
  locale: "en-GB",
  email_verified: true,
  paid_user: "0",
  gender: "",
  image_path: "",
  line_one_address: "",
  line_two_address: "",
  line_three_address: "",
  line_four_address: "",
  line_country_address: "",
  delivery_notes: "",
};

const session = (token: string) => ({
  token_type: "Bearer" as const,
  access_token: token,
  access_expires_at: "2099-01-01T00:00:00Z",
  refresh_via_cookie: true as const,
  user,
});

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(status >= 400
    ? { success: false, error: { code: "request_failed", message: "failed" } }
    : { success: true, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestUrl(call: unknown[]): string {
  return String(call[0]);
}

describe("canonical Web auth client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearInMemoryAccessToken();
    localStorage.clear();
  });

  it("uses the exact V1 login contract and never persists the password", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(session("access-1")))
      .mockResolvedValueOnce(response({ user }));

    await login("person@example.test", "correct horse battery staple");

    expect(requestUrl(fetchMock.mock.calls[0])).toBe(`${authApiUrls.AUTH_BASE}/login.php`);
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({
      email: "person@example.test",
      password: "correct horse battery staple",
      client: WEB_CLIENT,
      version: WEB_VERSION,
    });
    expect(localStorage.length).toBe(0);
    expect(requestUrl(fetchMock.mock.calls[1])).toBe(authApiUrls.ME_URL);
  });

  it("uses canonical registration provenance and payload names", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({
      user_id: 42,
      verification_required: true,
    }));

    await register({
      email: "person@example.test",
      password: "correct horse battery staple",
      firstName: "Person",
      lastName: "Example",
      mobileNumber: "123",
      locale: "en-GB",
      gender: "",
    });

    expect(requestUrl(fetchMock.mock.calls[0])).toBe(`${authApiUrls.AUTH_BASE}/register.php`);
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toMatchObject({
      first_name: "Person",
      last_name: "Example",
      mobile_number: "123",
      locale: "en-GB",
      client: WEB_CLIENT,
      version: WEB_VERSION,
    });
  });

  it("restores through refresh and resolves identity through /me", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(session("access-refresh")))
      .mockResolvedValueOnce(response({ user }));

    expect(await restoreSession()).toEqual(user);
    expect(requestUrl(fetchMock.mock.calls[0])).toBe(`${authApiUrls.AUTH_BASE}/refresh.php`);
    expect(requestUrl(fetchMock.mock.calls[1])).toBe(authApiUrls.ME_URL);
  });

  it("refreshes once after a genuine 401 and retries the request once", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(session("access-old")))
      .mockResolvedValueOnce(response({ user }))
      .mockResolvedValueOnce(response(null, 401))
      .mockResolvedValueOnce(response(session("access-new")))
      .mockResolvedValueOnce(response({ user }))
      .mockResolvedValueOnce(response({ ok: true }));

    await login("person@example.test", "password");
    const result = await authenticatedFetch("https://stage-web.gpsshops.com/menu1/api/v1/company.php");

    expect(result.status).toBe(200);
    expect(fetchMock.mock.calls.filter((call) => requestUrl(call).endsWith("/refresh.php"))).toHaveLength(1);
    expect(fetchMock.mock.calls.filter((call) => requestUrl(call).endsWith("/company.php"))).toHaveLength(2);
    const retryHeaders = new Headers((fetchMock.mock.calls.at(-1)?.[1] as RequestInit | undefined)?.headers);
    expect(retryHeaders.get("Authorization") || retryHeaders.get("X-GPS-Shops-Authorization")).toBe("Bearer access-new");
  });

  it("shares one refresh among concurrent 401 responses", async () => {
    let releaseRefresh!: (value: Response) => void;
    const refresh = new Promise<Response>((resolve) => { releaseRefresh = resolve; });
    let companyCalls = 0;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/login.php")) return response(session("access-old"));
      if (url.endsWith("/me.php")) return response({ user });
      if (url.endsWith("/refresh.php")) return refresh;
      if (url.endsWith("/company.php")) {
        companyCalls += 1;
        return companyCalls <= 2 ? response(null, 401) : response({ ok: true });
      }
      return response(null, 404);
    });

    await login("person@example.test", "password");
    const first = authenticatedFetch("https://stage-web.gpsshops.com/menu1/api/v1/company.php");
    const second = authenticatedFetch("https://stage-web.gpsshops.com/menu1/api/v1/company.php");
    await Promise.resolve();
    expect(fetchMock.mock.calls.filter((call) => requestUrl(call).endsWith("/refresh.php"))).toHaveLength(1);
    releaseRefresh(response(session("access-new")));
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(companyCalls).toBe(4);
  });

  it("does not refresh ordinary 403, 409, or 422 responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(session("access")))
      .mockResolvedValueOnce(response({ user }));
    await login("person@example.test", "password");
    for (const status of [403, 409, 422]) {
      fetchMock.mockResolvedValueOnce(response(null, status));
      expect((await authenticatedFetch(`https://stage-web.gpsshops.com/menu1/api/v1/status-${status}.php`)).status).toBe(status);
    }
    expect(fetchMock.mock.calls.filter((call) => requestUrl(call).endsWith("/refresh.php"))).toHaveLength(0);
  });

  it("returns the original 401 after one terminal refresh failure", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(session("access")))
      .mockResolvedValueOnce(response({ user }))
      .mockResolvedValueOnce(response(null, 401))
      .mockResolvedValueOnce(response(null, 401));
    await login("person@example.test", "password");
    const result = await authenticatedFetch("https://stage-web.gpsshops.com/menu1/api/v1/profile.php");
    expect(result.status).toBe(401);
    expect(fetchMock.mock.calls.filter((call) => requestUrl(call).endsWith("/refresh.php"))).toHaveLength(1);
    expect(fetchMock.mock.calls.filter((call) => requestUrl(call).endsWith("/profile.php"))).toHaveLength(1);
  });

  it("uses canonical logout and clears memory even when the server rejects it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(session("access")))
      .mockResolvedValueOnce(response({ user }))
      .mockResolvedValueOnce(response(null, 401))
      .mockResolvedValueOnce(response(null, 401));
    await login("person@example.test", "password");
    await logout();
    expect(requestUrl(fetchMock.mock.calls[2])).toBe(`${authApiUrls.AUTH_BASE}/logout.php`);
    expect(requestUrl(fetchMock.mock.calls[3])).toBe(`${authApiUrls.AUTH_BASE}/refresh.php`);
    expect(localStorage.length).toBe(0);
  });

  it("keeps resend verification and password reset on canonical V1", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => response({ accepted: true }));
    await resendVerification("person@example.test");
    await requestPasswordReset("person@example.test");
    expect(requestUrl(fetchMock.mock.calls[0])).toBe(`${authApiUrls.AUTH_BASE}/resend-verification.php`);
    expect(requestUrl(fetchMock.mock.calls[1])).toBe(`${authApiUrls.AUTH_BASE}/request-password-reset.php`);
  });

  it("uses the canonical verify-email contract", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => response({ verified: true }));
    await verifyEmail("verification-token");
    expect(requestUrl(fetchMock.mock.calls[0])).toBe(`${authApiUrls.AUTH_BASE}/verify-email.php`);
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({ token: "verification-token" });
  });
});
