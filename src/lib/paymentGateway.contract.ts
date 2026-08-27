export const STAGING_PAYMENTS_DISABLED_MESSAGE = "Payments are disabled in staging.";

export class PaymentUnavailableError extends Error {
  readonly code = "payments_disabled_in_staging";

  constructor(message = STAGING_PAYMENTS_DISABLED_MESSAGE) {
    super(message);
    this.name = "PaymentUnavailableError";
  }
}

export interface ProCheckoutInput {
  personId: string | number;
  email: string;
}

export interface OwnerPaymentSetupInput {
  userId: string | number;
  email: string;
}

export type OwnerPaymentSetupResult =
  | { kind: "already_setup"; message: string }
  | { kind: "redirect"; url: string };
