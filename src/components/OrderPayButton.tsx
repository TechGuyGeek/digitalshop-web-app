import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createOrderPaymentQr } from "@/lib/orderPaymentQr";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface OrderPayButtonProps {
  companyId: string;
  orderId: string;
  totalAmount: number;
  hasPaid: boolean;
}

const OrderPayButton = ({ companyId, orderId, totalAmount, hasPaid }: OrderPayButtonProps) => {
  const { t } = useLanguage();
  const [qr, setQr] = useState<string | null>(null);

  const handlePay = async () => {
    if (!hasPaid) toast.info(t("PaymentMethodComingSoon"));
  };

  return (
    <div className="px-4 py-3 bg-card border-t border-border shrink-0 space-y-1">
      <Button
        className="w-full rounded-full text-sm"
        disabled={hasPaid}
        onClick={handlePay}
      >
        {hasPaid ? (t("Paid") || "Paid") : (t("Pay") || "Pay")}
      </Button>
      <Button variant="outline" className="w-full" onClick={async()=>{try{const q=await createOrderPaymentQr(orderId);setQr(`${window.location.origin}${import.meta.env.BASE_URL}order-pay-scan?t=${encodeURIComponent(q.token)}`);}catch(e){toast.error((e as Error).message);}}}>{t("ShowOrderQR")}</Button>
      {qr && <div className="flex flex-col items-center gap-2 p-3"><QRCodeSVG value={qr} size={190}/><Button variant="ghost" onClick={()=>setQr(null)}>{t("Close") || "Close"}</Button></div>}
    </div>
  );
};

export default OrderPayButton;
