import { Link } from "react-router-dom";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Analytics } from "@/lib/analytics";
import {
  beginOwnerPaymentSetup,
  paymentsDisabledInCurrentBuild,
  PaymentUnavailableError,
  STAGING_PAYMENTS_DISABLED_MESSAGE,
} from "@/lib/paymentGateway";

const PaymentMethods = () => {
  const { t } = useLanguage();
  const [hasMethod, setHasMethod] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("digitalUser");
      if (raw) {
        const u = JSON.parse(raw) as Record<string, unknown>;
        // Heuristic: backend may later expose a saved Stripe customer/payment id
        const candidate =
          u.StripeCustomerId ?? u.stripeCustomerId ?? u.HasPaymentMethod ?? u.hasPaymentMethod;
        if (candidate) setHasMethod(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSetup = async () => {
    if (loading) return;
    let userId = "";
    let email = "";
    try {
      const raw = localStorage.getItem("digitalUser");
      if (raw) {
        const u = JSON.parse(raw) as Record<string, unknown>;
        userId = String(u.PersonID ?? u.personID ?? u.personid ?? u.UserID ?? "");
        email = String(u.Email ?? u.email ?? u.UserEmail ?? "");
      }
    } catch { /* ignore */ }

    if (!userId) {
      toast.error("Please sign in again.");
      return;
    }

    setLoading(true);
    Analytics.paymentStarted({ flow: "stripe_onboarding" });
    try {
      const result = await beginOwnerPaymentSetup({ userId, email });
      if (result.kind === "already_setup") {
        toast.success(result.message);
        return;
      }
      window.location.href = result.url;
    } catch (err) {
      toast.error(err instanceof PaymentUnavailableError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <header className="px-6 pt-6 pb-2">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("Back") || "Back"}
        </Link>
      </header>

      <main className="px-6 pb-16 pt-4 max-w-prose mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-7 w-7 text-primary" />
          <h1 className="font-heading text-3xl tracking-tight text-foreground">
            {t("MyPaymentMethods") || "My Payment Methods"}
          </h1>
        </div>

        <p className="text-muted-foreground mb-6 leading-relaxed">
          {t("PaymentMethodsIntro") ||
            "Customers can use Stripe to securely pay for goods. GPS Shops does not store card details directly. Payment details are handled by Stripe."}
        </p>

        <section className="rounded-lg border border-border bg-card p-4 mb-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-2">
              <h2 className="font-heading text-lg text-foreground">
                {t("SecurePayments") || "Secure payments"}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("PaymentMethodsSecurityNote") ||
                  "Your card information is encrypted and stored by Stripe, a PCI-DSS certified payment provider. GPS Shops never sees or stores your full card number."}
              </p>
            </div>
          </div>
        </section>

        <Button onClick={handleSetup} className="w-full" size="lg" disabled={loading}>
          {loading
            ? t("PleaseWait") || "Please wait…"
            : hasMethod
            ? t("ManagePaymentMethod") || "Manage payment method"
            : t("SetUpPaymentMethod") || "Set up payment method"}
        </Button>

        {paymentsDisabledInCurrentBuild && (
          <p className="text-sm text-muted-foreground mt-3 text-center" role="status">
            {STAGING_PAYMENTS_DISABLED_MESSAGE}
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-4 text-center">
          {t("PoweredByStripe") || "Payments powered by Stripe."}
        </p>
      </main>
    </div>
  );
};

export default PaymentMethods;
