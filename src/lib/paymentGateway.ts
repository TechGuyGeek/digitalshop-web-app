import { API_ORIGIN } from "@/lib/authClient";
import {
  type OwnerPaymentSetupInput,
  type OwnerPaymentSetupResult,
  type ProCheckoutInput,
} from "./paymentGateway.contract";

export { PaymentUnavailableError, STAGING_PAYMENTS_DISABLED_MESSAGE } from "./paymentGateway.contract";

export const paymentsDisabledInCurrentBuild = false;

async function postForm(path: string, fields: Record<string, string>): Promise<Record<string, unknown>> {
  const form = new URLSearchParams();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  const response = await fetch(`${API_ORIGIN}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const data = await response.json().catch(() => null) as Record<string, unknown> | null;

  if (!response.ok || !data) {
    throw new Error("Could not reach payment service. Please try again.");
  }
  return data;
}

function message(data: Record<string, unknown>, fallback: string): string {
  return typeof data.message === "string"
    ? data.message
    : typeof data.ServerMessage === "string"
      ? data.ServerMessage
      : fallback;
}

export async function beginProCheckout(input: ProCheckoutInput): Promise<string> {
  const data = await postForm("/menu1/PHPwrite/User/CreateStripeCheckoutSession.php", {
    PersonID: String(input.personId),
    Email: input.email,
  });
  if (typeof data.url !== "string" || !data.url) {
    throw new Error(message(data, "Could not start checkout. Please try again."));
  }
  return data.url;
}

export async function beginOwnerPaymentSetup(input: OwnerPaymentSetupInput): Promise<OwnerPaymentSetupResult> {
  const userId = String(input.userId);
  const check = await postForm("/menu1/PHPread/Stripe/CheckStripeSetupAllowed.php", { UserID: userId });
  if (check.success !== true) throw new Error(message(check, "Stripe setup not available."));

  const action = typeof check.action === "string" ? check.action : "";
  const companyID = String(check.companyID ?? check.companyid ?? "");

  if (action === "already_setup") {
    return { kind: "already_setup", message: message(check, "Stripe is already set up for this shop") };
  }
  if (!companyID) throw new Error("Missing company information.");

  if (action === "create_account") {
    const created = await postForm("/menu1/PHPwrite/Stripe/CreateStripeConnectedAccount.php", {
      companyID,
      UserID: userId,
      email: input.email,
    });
    if (created.success !== true) throw new Error(message(created, "Could not create Stripe account."));
  } else if (action !== "continue_onboarding") {
    throw new Error(message(check, "Unsupported Stripe setup state."));
  }

  const link = await postForm("/menu1/PHPwrite/Stripe/CreateStripeOnboardingLink.php", {
    companyID,
    UserID: userId,
  });
  if (link.success !== true || typeof link.url !== "string" || !link.url) {
    throw new Error(message(link, "Could not create onboarding link."));
  }
  return { kind: "redirect", url: link.url };
}
