import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBasket } from "@/contexts/BasketContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAdverts } from "@/hooks/useAdverts";
import VideoAdvert from "@/components/adverts/VideoAdvert";
import { useRegisterNavActions } from "@/contexts/SiteNavExtras";
import ProfileHelpAssistant from "@/components/ProfileHelpAssistant";
import { Analytics } from "@/lib/analytics";
import { placeOrderBatch, clearCheckoutId } from "@/lib/checkout";
import { useAuth } from "@/contexts/AuthContext";

const SERVER_DOMAIN = "https://web.gpsshops.com/";

const isEnabled = (value: unknown): boolean => String(value) === "1";

type OrderMode = "onsite" | "takeaway" | "delivery";

const Basket = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [tableNumber, setTableNumber] = useState<string>("");

  useRegisterNavActions(
    "basket-payment",
    [
      {
        id: "payment-methods",
        label: t("MyPaymentMethods") || "My Payment Methods",
        onClick: () => navigate("/payment-methods"),
      },
    ],
    [t, navigate],
  );
  const [searchParams] = useSearchParams();
  const shopName = searchParams.get("shop") || "Shop";
  const companyId = searchParams.get("companyid") || sessionStorage.getItem("basket_companyId") || "";
  const { items, count, total, removeItem, clearItem, clearBasket } = useBasket();
  const { user } = useAuth();
  const { canShowVideo, showVideoAd, dismissVideoAd, videoAdvert, videoVisible } = useAdverts();
  const [submitting, setSubmitting] = useState(false);
  const [orderEnable, setOrderEnable] = useState(false);
  const [takeawayEnable, setTakeawayEnable] = useState(false);
  const [deliveryEnable, setDeliveryEnable] = useState(false);
  const [totalTables, setTotalTables] = useState(0);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    const fetchSettings = async () => {
      try {
        const url = SERVER_DOMAIN + "menu1/PHPread/ClientMenu/DoesCompanyExistCompanyIDnewUpgraded.php";
        const formData = new URLSearchParams();
        formData.append("companyID", companyId);
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: formData.toString() });
        const data = await res.json();
        const company = Array.isArray(data) ? data[0] : data;
        const oe = isEnabled(company?.OrderEnable);
        const te = isEnabled(company?.TakeawayEnable);
        const de = isEnabled(company?.DeliveryEnable);
        const tables = parseInt(String(company?.TableNumbers || "0"), 10) || 0;
        setOrderEnable(oe);
        setTakeawayEnable(te);
        setDeliveryEnable(de);
        setTotalTables(tables);
        console.log(`[Basket] Company ${companyId} — OrderEnable:${oe}, TakeawayEnable:${te}, DeliveryEnable:${de}, TotalTables:${tables}`);
      } catch (err) {
        console.error("[Basket] Failed to fetch company settings:", err);
      } finally {
        setSettingsLoaded(true);
      }
    };
    fetchSettings();
  }, [companyId]);
  const getLoggedInUser = () => {
    try { const stored = localStorage.getItem("digitalUser"); if (stored) return JSON.parse(stored); } catch {} return null;
  };

  const placeOrder = async (mode: OrderMode) => {
    if (submitting) return;
    if (!companyId) { toast.error(t("Pleasecreateacompanyfirst")); return; }
    if (items.length === 0) { toast.error(t("YouhaveNoOrdersselected")); return; }
    if (!user) { toast.error(t("Signin")); return; }
    setSubmitting(true);
    Analytics.orderStarted({ company_id: companyId, items: items.length, total, mode });
    try {
      const result = await placeOrderBatch({
        companyId,
        mode,
        tableNumber: tableNumber || "0",
        items: items.map((i) => ({ productId: i.id, groupId: i.groupId || "0", quantity: i.quantity })),
      });
      if (!result.success) {
        // Preserve the basket and the existing checkoutId so retry is safe.
        toast.error(result.message || t("SaveFailed"));
        return;
      }
      clearCheckoutId();
      clearBasket();
      Analytics.orderCompleted({ company_id: companyId, items: items.length, total, mode, random_code: result.checkoutId });
      toast.success(t("SaveSuccessful"));
      if (canShowVideo) {
        showVideoAd("afterOrderPlaced");
      } else {
        navigate("/orders");
      }
    } catch (err) { console.error("Order submission failed:", err); toast.error(t("SaveFailed")); }
    finally { setSubmitting(false); }
  };

  const handleVideoFinished = () => {
    dismissVideoAd();
    navigate("/orders");
  };

  return (
    <div className="h-dvh bg-muted flex flex-col max-w-md mx-auto w-full">
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate(`/shop-interior?name=${encodeURIComponent(shopName)}&companyid=${encodeURIComponent(companyId)}`)}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">{t("Basket")}</h1>
      </div>
      <div className="bg-card px-4 py-3 flex flex-col gap-1 border-b border-border">
        <div className="flex justify-between text-foreground font-semibold text-sm">
          <span>{t("Totalitems")}</span><span>{count}</span>
        </div>
        <div className="flex justify-between text-foreground font-semibold text-sm">
          <span>{t("TOTALPRICE")}</span><span>£{total.toFixed(2)}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <ProfileHelpAssistant translationKey="HELPTOTALORDERSNOPIC" />
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <span className="text-4xl mb-4">🛒</span>
            <p className="text-sm">{t("YouhaveNoOrdersselected")}</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-xl overflow-hidden bg-card shadow-md">
              <div className="relative w-full h-40 bg-muted">
                {item.image ? (<img src={item.image} alt={item.name} className="w-full h-full object-cover" />) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent/30 to-muted flex items-center justify-center"><span className="text-4xl">🍽️</span></div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 flex items-end justify-between">
                  <span className="text-white font-bold text-sm uppercase tracking-wide">{item.name}</span>
                  <span className="text-white font-bold text-sm">£{item.price.toFixed(2)}</span>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-muted-foreground text-sm">{item.description}</p>
                <p className="text-foreground text-xs mt-1">Qty: {item.quantity}</p>
              </div>
              <div className="px-4 pb-3 flex items-center justify-center gap-3">
                <Button variant="destructive" size="sm" className="rounded-full px-5 gap-1" onClick={() => removeItem(item.id)} disabled={submitting}>
                  <Trash2 size={14} />{t("Delete")}
                </Button>
                <Button variant="outline" size="sm" className="rounded-full px-5 gap-1" onClick={() => clearItem(item.id)} disabled={submitting}>
                  <X size={14} />{t("Clear")}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      {totalTables > 0 && (
        <div className="bg-card border-t border-border px-4 py-3 shrink-0 flex items-center justify-between">
          <p className="text-muted-foreground text-sm font-medium">{t("TableNumber")}</p>
          <Select value={tableNumber} onValueChange={setTableNumber}>
            <SelectTrigger className="w-28 h-9 rounded-full"><SelectValue placeholder={t("TableNumber")} /></SelectTrigger>
            <SelectContent className="max-h-60">
              {Array.from({ length: totalTables + 1 }, (_, i) => (<SelectItem key={i} value={String(i)}>{i}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="bg-card border-t border-border px-4 py-4 flex items-center justify-between gap-3 shrink-0">
        {!settingsLoaded ? (
          <div className="flex-1 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" size={18} /></div>
        ) : !orderEnable && !takeawayEnable && !deliveryEnable ? (
          <p className="flex-1 text-center text-muted-foreground text-sm">{t("Noitemsforsale")}</p>
        ) : (
          <>
            {takeawayEnable && (
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => placeOrder("takeaway")} disabled={submitting || items.length === 0}>
                {submitting ? <Loader2 className="animate-spin mr-1" size={14} /> : null}{t("TakeAway")}
              </Button>
            )}
            {orderEnable && (
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => placeOrder("onsite")} disabled={submitting || items.length === 0}>
                {submitting ? <Loader2 className="animate-spin mr-1" size={14} /> : null}{t("OnSite")}
              </Button>
            )}
            {deliveryEnable && (
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => placeOrder("delivery")} disabled={submitting || items.length === 0}>
                {submitting ? <Loader2 className="animate-spin mr-1" size={14} /> : null}{t("Deliver")}
              </Button>
            )}
          </>
        )}
      </div>
      <VideoAdvert
        advert={videoAdvert}
        visible={videoVisible}
        onDismiss={handleVideoFinished}
        onComplete={handleVideoFinished}
        dismissible={true}
      />
    </div>
  );
};

export default Basket;
