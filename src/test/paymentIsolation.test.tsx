import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GlobalUpgradeNavAction from "@/components/GlobalUpgradeNavAction";
import { PaymentUnavailableError, STAGING_PAYMENTS_DISABLED_MESSAGE } from "@/lib/paymentGateway.contract";
import PaymentMethods from "@/pages/PaymentMethods";

const mocks = vi.hoisted(() => ({
  beginProCheckout: vi.fn(),
  beginOwnerPaymentSetup: vi.fn(),
  registerActions: vi.fn(),
  toastError: vi.fn(),
  paymentStarted: vi.fn(),
}));

vi.mock("@/lib/paymentGateway", async () => {
  const contract = await vi.importActual<typeof import("@/lib/paymentGateway.contract")>("@/lib/paymentGateway.contract");
  return {
    beginProCheckout: mocks.beginProCheckout,
    beginOwnerPaymentSetup: mocks.beginOwnerPaymentSetup,
    paymentsDisabledInCurrentBuild: true,
    PaymentUnavailableError: contract.PaymentUnavailableError,
    STAGING_PAYMENTS_DISABLED_MESSAGE: contract.STAGING_PAYMENTS_DISABLED_MESSAGE,
  };
});
vi.mock("@/contexts/SiteNavExtras", () => ({ useRegisterNavActions: mocks.registerActions }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/analytics", () => ({ Analytics: { paymentStarted: mocks.paymentStarted } }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

function registeredGoProAction() {
  const call = mocks.registerActions.mock.calls.at(-1);
  return call?.[1]?.find((action: { id: string }) => action.id === "go-pro") as { onClick: () => Promise<void> } | undefined;
}

describe("staging payment isolation UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("intercepts the staging Go Pro action before any production checkout request", async () => {
    localStorage.setItem("digitalUser", JSON.stringify({ PersonID: 55, Email: "buyer@example.test", PaidUser: "0" }));
    mocks.beginProCheckout.mockRejectedValueOnce(new PaymentUnavailableError());

    render(<MemoryRouter initialEntries={["/profile"]}><GlobalUpgradeNavAction /></MemoryRouter>);
    const action = registeredGoProAction();
    expect(action).toBeDefined();

    await act(async () => action?.onClick());

    expect(mocks.beginProCheckout).toHaveBeenCalledWith({ personId: "55", email: "buyer@example.test" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith(STAGING_PAYMENTS_DISABLED_MESSAGE);
  });

  it("keeps PaidUser entitlement behavior by hiding the Go Pro action", () => {
    localStorage.setItem("digitalUser", JSON.stringify({ PersonID: 55, Email: "buyer@example.test", PaidUser: "2" }));
    render(<MemoryRouter initialEntries={["/profile"]}><GlobalUpgradeNavAction /></MemoryRouter>);
    expect(registeredGoProAction()).toBeUndefined();
  });

  it("keeps Payment Methods reachable but fails closed before setup, account, or onboarding requests", async () => {
    localStorage.setItem("digitalUser", JSON.stringify({ PersonID: 55, Email: "owner@example.test" }));
    mocks.beginOwnerPaymentSetup.mockRejectedValueOnce(new PaymentUnavailableError());

    render(<MemoryRouter><PaymentMethods /></MemoryRouter>);
    expect(screen.getByRole("status")).toHaveTextContent(STAGING_PAYMENTS_DISABLED_MESSAGE);
    fireEvent.click(screen.getByRole("button", { name: "SetUpPaymentMethod" }));

    await waitFor(() => expect(mocks.beginOwnerPaymentSetup).toHaveBeenCalledWith({ userId: "55", email: "owner@example.test" }));
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith(STAGING_PAYMENTS_DISABLED_MESSAGE);
  });
});
