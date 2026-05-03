import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

interface OrderPayButtonProps {
  companyId: string;
  orderId: string;
  totalAmount: number;
  hasPaid: boolean;
}

const OrderPayButton = ({ companyId, orderId, totalAmount, hasPaid }: OrderPayButtonProps) => {
  const { t } = useLanguage();
  const [paying, setPaying] = useState(false);

  const getPersonId = (): string => {
    try {
      const stored = localStorage.getItem("digitalUser");
      if (stored) {
        const u = JSON.parse(stored);
        return String(u.PersonID || u.ID || "");
      }
    } catch {}
    return "";
  };

  const getEmail = (): string => {
    try {
      const stored = localStorage.getItem("digitalUser");
      if (stored) {
        const u = JSON.parse(stored);
        return String(u.Email || u.email || "");
      }
    } catch {}
    return "";
  };

  const handlePay = async () => {
    if (hasPaid || paying) return;
    if (totalAmount < 5) {
      toast.info(t("OrdersOverFiveOnly") || "Orders over £5.00 only");
      return;
    }
    const personId = getPersonId();
    if (!personId || !companyId) return;
    setPaying(true);
    try {
      const checkBody = new URLSearchParams();
      checkBody.append("companyID", companyId);
      checkBody.append("UserID", personId);
      let checkData: { success?: boolean; [k: string]: unknown } | null = null;
      try {
        const res = await fetch(SERVER_DOMAIN + "menu1/PHPread/Stripe/CheckStripePaymentAllowed.php", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: checkBody.toString(),
        });
        const text = await res.text();
        console.log("[Pay] CheckStripePaymentAllowed:", res.status, text);
        try { checkData = JSON.parse(text); } catch { checkData = null; }
      } catch (e) { console.error("[Pay] check err", e); }
      if (!checkData || checkData.success !== true) {
        toast.info(t("PaymentMethodComingSoon") || "Payments aren't set up yet.");
        return;
      }

      const sessionBody = new URLSearchParams();
      sessionBody.append("companyID", companyId);
      sessionBody.append("UserID", personId);
      sessionBody.append("orderID", orderId);
      sessionBody.append("amount", totalAmount.toFixed(2));
      sessionBody.append("email", getEmail());
      let sessionData: { success?: boolean; checkoutUrl?: string; [k: string]: unknown } | null = null;
      try {
        const res = await fetch(SERVER_DOMAIN + "menu1/PHPwrite/Stripe/CreateOrderCheckoutSession.php", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: sessionBody.toString(),
        });
        const text = await res.text();
        console.log("[Pay] CreateOrderCheckoutSession:", res.status, text);
        try { sessionData = JSON.parse(text); } catch { sessionData = null; }
      } catch (e) { console.error("[Pay] session err", e); }
      if (sessionData && sessionData.success === true && sessionData.checkoutUrl) {
        window.location.href = String(sessionData.checkoutUrl);
        return;
      }
      toast.error(t("SaveFailed") || "Could not start checkout.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="px-4 py-3 bg-card border-t border-border shrink-0 space-y-1">
      <Button
        className="w-full rounded-full text-sm"
        disabled={hasPaid || paying}
        onClick={handlePay}
      >
        {paying ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
        {hasPaid ? (t("Paid") || "Paid") : (t("Pay") || "Pay")}
      </Button>
      {!hasPaid && (
        <p className="text-xs text-center text-muted-foreground">
          {t("OrdersOverFiveOnly") || "Orders over £5.00 only"}
        </p>
      )}
    </div>
  );
};

export default OrderPayButton;