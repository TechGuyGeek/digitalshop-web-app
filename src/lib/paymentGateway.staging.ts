import {
  PaymentUnavailableError,
  type OwnerPaymentSetupInput,
  type OwnerPaymentSetupResult,
  type ProCheckoutInput,
} from "./paymentGateway.contract";

export { PaymentUnavailableError, STAGING_PAYMENTS_DISABLED_MESSAGE } from "./paymentGateway.contract";

export const paymentsDisabledInCurrentBuild = true;

export async function beginProCheckout(_input: ProCheckoutInput): Promise<string> {
  throw new PaymentUnavailableError();
}

export async function beginOwnerPaymentSetup(_input: OwnerPaymentSetupInput): Promise<OwnerPaymentSetupResult> {
  throw new PaymentUnavailableError();
}
