import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthApiError } from "@/lib/authClient";
import { isAdminEmail } from "@/lib/adminAccess";
import AdminShops from "@/pages/AdminShops";
import GlobalAdminNavAction from "@/components/GlobalAdminNavAction";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  fetchAdminShops: vi.fn(),
  registerActions: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: mocks.auth }));
vi.mock("@/lib/adminShopsApi", () => ({ fetchAdminShops: mocks.fetchAdminShops }));
vi.mock("@/contexts/SiteNavExtras", () => ({ useRegisterNavActions: mocks.registerActions }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/GoogleMap", () => ({ default: ({ shops }: { shops: Array<{ name: string }> }) => <div data-testid="admin-map">{shops.map((shop) => shop.name).join(",")}</div> }));
vi.mock("@/lib/mapMarkerIcons", () => ({ DEFAULT_MARKER_ICON: "marker", getMarkerIconUrl: () => "marker" }));

function auth(email: string | null, status: "loading" | "authenticated" | "anonymous" = email ? "authenticated" : "anonymous") {
  mocks.auth.mockReturnValue({ status, user: email ? { email } : null });
}

function navActions() {
  const call = mocks.registerActions.mock.calls.at(-1);
  return call?.[1] as Array<{ id: string }> | undefined;
}

function renderNav() {
  return render(<MemoryRouter><GlobalAdminNavAction /></MemoryRouter>);
}

function renderAdminRoute() {
  return render(<MemoryRouter initialEntries={["/admin-shops"]}><AdminShops /></MemoryRouter>);
}

describe("Web Admin access and direct route safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
  });

  it.each([
    ["signed out", null],
    ["ordinary customer", "customer@example.test"],
    ["owner", "owner@example.test"],
    ["Pro non-admin", "pro@example.test"],
  ])("hides Admin navigation for %s", (_label, email) => {
    auth(email);
    renderNav();
    expect(navActions()).toEqual([]);
  });

  it("shows Admin navigation only for the exact normalized email", () => {
    auth("  JASON.PURKISS.BSC@GMAIL.COM ");
    renderNav();
    expect(navActions()).toEqual([expect.objectContaining({ id: "admin-shops" })]);
    expect(isAdminEmail("  JASON.PURKISS.BSC@GMAIL.COM ")).toBe(true);
  });

  it("does not fetch or expose Admin data for a signed-out direct route", () => {
    auth(null);
    renderAdminRoute();
    expect(screen.getByRole("alert")).toHaveTextContent("Sign in is required.");
    expect(mocks.fetchAdminShops).not.toHaveBeenCalled();
    expect(screen.queryByTestId("admin-map")).not.toBeInTheDocument();
  });

  it("shows a restricted state for an authenticated non-admin 403 without a public fallback", async () => {
    auth("customer@example.test");
    mocks.fetchAdminShops.mockRejectedValueOnce(new AuthApiError(403, "admin_forbidden", "Administrator access is required."));
    renderAdminRoute();

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Administrator access is required."));
    expect(mocks.fetchAdminShops).toHaveBeenCalledWith(null);
    expect(screen.queryByText("Global Shops")).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-map")).not.toBeInTheDocument();
  });

  it("renders valid canonical Admin shops without location and remains read-only", async () => {
    auth("jason.purkiss.bsc@gmail.com");
    mocks.fetchAdminShops.mockResolvedValueOnce([{ companyid: 7, name: "Admin Cafe", icon: "☕", lat: 51.5, lng: -0.1, categoryCode: 3, categoryLabel: "Cafe", distance: null }]);
    const { container } = renderAdminRoute();

    await waitFor(() => expect(screen.getAllByText("Admin Cafe")).toHaveLength(2));
    expect(mocks.fetchAdminShops).toHaveBeenCalledWith(null);
    expect(screen.getByTestId("admin-map")).toHaveTextContent("Admin Cafe");
    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(container.querySelector('input')).toBeNull();
  });
});
