import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginOwnerPaymentSetup as beginStagingOwnerPaymentSetup,
  beginProCheckout as beginStagingProCheckout,
  paymentsDisabledInCurrentBuild,
} from "@/lib/paymentGateway.staging";
import { PaymentUnavailableError, STAGING_PAYMENTS_DISABLED_MESSAGE } from "@/lib/paymentGateway.contract";
import { beginProCheckout as beginProductionProCheckout } from "@/lib/paymentGateway";

describe("payment gateway environment isolation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("staging disables every payment mutation before fetch, with no fallback", async () => {
    await expect(beginStagingProCheckout({ personId: 1, email: "pro@example.test" }))
      .rejects.toMatchObject({ code: "payments_disabled_in_staging", message: STAGING_PAYMENTS_DISABLED_MESSAGE });
    await expect(beginStagingOwnerPaymentSetup({ userId: 2, email: "owner@example.test" }))
      .rejects.toBeInstanceOf(PaymentUnavailableError);

    expect(paymentsDisabledInCurrentBuild).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("keeps the legacy production checkout path structurally available outside staging", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ url: "https://checkout.stripe.com/test-session" }), { status: 200 }));

    await expect(beginProductionProCheckout({ personId: 3, email: "production@example.test" }))
      .resolves.toBe("https://checkout.stripe.com/test-session");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://web.gpsshops.com/menu1/PHPwrite/User/CreateStripeCheckoutSession.php",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("keeps staging implementation and staging alias free of all legacy Stripe endpoint paths", () => {
    const stagingGateway = readFileSync("src/lib/paymentGateway.staging.ts", "utf8");
    const viteConfig = readFileSync("vite.config.ts", "utf8");
    for (const endpoint of [
      "CreateStripeCheckoutSession.php",
      "CheckStripeSetupAllowed.php",
      "CreateStripeConnectedAccount.php",
      "CreateStripeOnboardingLink.php",
    ]) {
      expect(stagingGateway).not.toContain(endpoint);
    }
    expect(viteConfig).toContain('mode === "staging"');
    expect(viteConfig).toContain("paymentGateway.staging.ts");
  });
});
