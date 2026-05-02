import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegisterNavActions } from "@/contexts/SiteNavExtras";
import {
  fetchOrdersToday, fetchOrdersWeek, fetchOrdersMonth,
  requestCancelOrder, groupOrdersBySession, getCompanyPhotoUrl,
  type GroupedOrder,
} from "@/lib/orderHistory";

type TabKey = "today" | "week" | "month";

const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

const ORDER_DETAIL_ENDPOINTS: Record<TabKey, string> = {
  today: "menu1/PHPread/CompanyLiveUserOrders/RetriveLiveUserOrderDetails.php",
  week: "menu1/PHPread/CompanyLiveUserOrders/RetriveLiveUserOrderDetailsweek.php",
  month: "menu1/PHPread/CompanyLiveUserOrders/RetriveLiveUserOrderDetailsmonth.php",
};

const Orders = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [todayOrders, setTodayOrders] = useState<GroupedOrder[]>([]);
  const [weekOrders, setWeekOrders] = useState<GroupedOrder[]>([]);
  const [monthOrders, setMonthOrders] = useState<GroupedOrder[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);

  const TABS: { key: TabKey; label: string }[] = [
    { key: "today", label: t("Today") },
    { key: "week", label: t("Week") },
    { key: "month", label: t("Month") },
  ];

  const getPersonId = (): string => {
    try { const stored = localStorage.getItem("digitalUser"); if (stored) { const user = JSON.parse(stored); return String(user.PersonID || user.ID || ""); } } catch {} return "";
  };

  const loadOrders = useCallback(async () => {
    const personId = getPersonId();
    if (!personId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [today, week, month] = await Promise.all([fetchOrdersToday(personId), fetchOrdersWeek(personId), fetchOrdersMonth(personId)]);
      setTodayOrders(groupOrdersBySession(today)); setWeekOrders(groupOrdersBySession(week)); setMonthOrders(groupOrdersBySession(month));
    } catch (err) { console.error("Failed to load orders:", err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useRegisterNavActions(
    "orders-payment",
    [
      {
        id: "payment-methods",
        label: t("MyPaymentMethods") || "My Payment Methods",
        onClick: () => navigate("/payment-methods"),
      },
    ],
    [t, navigate],
  );

  const handlePay = async (order: GroupedOrder) => {
    if (order.hasPaid === "1" || payingId) return;
    const personId = getPersonId();
    if (!personId) return;
    let userEmail = "";
    try {
      const stored = localStorage.getItem("digitalUser");
      if (stored) {
        const u = JSON.parse(stored);
        userEmail = String(u.Email || u.email || "");
      }
    } catch {}

    setPayingId(order.randomCode);
    try {
      // 1) Check if Stripe payments are allowed for this user/company
      const checkBody = new URLSearchParams();
      checkBody.append("companyID", order.companyId);
      checkBody.append("UserID", personId);
      const checkRes = await fetch(
        SERVER_DOMAIN + "menu1/PHPread/Stripe/CheckStripePaymentAllowed.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: checkBody.toString(),
        },
      );
      const checkData = await checkRes.json().catch(() => null);
      if (!checkData || checkData.success !== true) {
        toast.info(
          t("PaymentMethodComingSoon") ||
            "Payments aren't set up yet. Open the menu and tap 'My Payment Methods' to get started.",
        );
        return;
      }

      // 2) Load real order details to calculate the real total
      const first = order.items[0];
      const clientId = String(first.clientid || first.Companyid || "");
      const detailBody = new URLSearchParams();
      detailBody.append("companyID", order.companyId);
      detailBody.append("OrderResult", clientId);
      detailBody.append("getDateandTime", order.dateTime);
      const detailRes = await fetch(SERVER_DOMAIN + ORDER_DETAIL_ENDPOINTS[activeTab], {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: detailBody.toString(),
      });
      const detailText = await detailRes.text();
      let detailItems: Array<Record<string, unknown>> = [];
      if (detailText && detailText.trim() !== "" && detailText.trim() !== "[]") {
        try {
          const parsed = JSON.parse(detailText);
          if (Array.isArray(parsed)) detailItems = parsed;
        } catch {}
      }
      if (detailItems.length === 0) {
        toast.error(t("SaveFailed") || "Could not load order details.");
        return;
      }
      const totalAmount = detailItems.reduce((sum, item) => {
        const price = parseFloat(String(item.OrderPrice || item.orderPrice || "0"));
        return sum + (isNaN(price) ? 0 : price);
      }, 0);
      const orderId = String(first.orderid || first.Orderid || order.randomCode);

      // 3) Create Stripe checkout session and redirect
      const sessionBody = new URLSearchParams();
      sessionBody.append("companyID", order.companyId);
      sessionBody.append("UserID", personId);
      sessionBody.append("orderID", orderId);
      sessionBody.append("amount", totalAmount.toFixed(2));
      sessionBody.append("email", userEmail);
      const sessionRes = await fetch(
        SERVER_DOMAIN + "menu1/PHPwrite/Stripe/CreateOrderCheckoutSession.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: sessionBody.toString(),
        },
      );
      const sessionData = await sessionRes.json().catch(() => null);
      if (sessionData && sessionData.success === true && sessionData.checkoutUrl) {
        window.location.href = String(sessionData.checkoutUrl);
        return;
      }
      toast.error(t("SaveFailed") || "Could not start checkout.");
    } catch (err) {
      console.error("Pay flow failed:", err);
      toast.error(t("Pleasecheckyourinternetconnection") || "Network error.");
    } finally {
      setPayingId(null);
    }
  };

  const currentOrders = activeTab === "today" ? todayOrders : activeTab === "week" ? weekOrders : monthOrders;

  const handleCancel = async (order: GroupedOrder) => {
    const personId = getPersonId(); if (!personId) return;
    setCancellingId(order.randomCode);
    const success = await requestCancelOrder(order, personId, activeTab);
    if (success) { toast.success(t("Requestwassent")); loadOrders(); } else { toast.error(t("SaveFailed")); }
    setCancellingId(null);
  };

  const handleOrderTap = (order: GroupedOrder) => {
    const first = order.items[0];
    const clientId = String(first.clientid || first.Companyid || "");
    const params = new URLSearchParams({ companyid: order.companyId, clientid: clientId, datetime: order.dateTime, companyname: order.companyName });
    const detailRoutes: Record<TabKey, string> = { today: "/order-detail", week: "/order-detail-week", month: "/order-detail-month" };
    navigate(`${detailRoutes[activeTab]}?${params.toString()}`);
  };

  const handleCompanyProfile = (order: GroupedOrder) => {
    if (order.companyId) navigate(`/company-profile-readonly?companyid=${encodeURIComponent(order.companyId)}`);
  };

  const getDeliveryType = (order: GroupedOrder) => {
    if (order.needDelivery === "1") return t("Deliver");
    if (order.needTakeaway === "1") return t("TakeAway");
    return t("OnSite");
  };

  const getPaymentLabel = (order: GroupedOrder) => order.hasPaid === "1" ? t("Paid") : t("NotPaid");
  const getDeliveryLabel = (order: GroupedOrder) => order.hasDelivered === "1" ? t("Delivered") : t("NotDelivered");

  return (
    <div className="h-screen bg-muted flex flex-col">
      <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate("/profile")}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">{t("Orders")}</h1>
      </div>
      <div className="flex border-b border-border bg-card shrink-0">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${activeTab === tab.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="bg-card px-4 py-2 shrink-0">
        <p className="text-center text-sm font-semibold text-foreground">{t("Orders")}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="animate-spin mb-4" size={32} /><p className="text-sm">{t("Pleasewait")}</p>
          </div>
        ) : currentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <span className="text-4xl mb-4">📦</span><p className="text-sm">{t("NoOrdersToshow")}</p>
          </div>
        ) : (
          currentOrders.map((order) => {
            const isCancelling = cancellingId === order.randomCode;
            const photoUrl = getCompanyPhotoUrl(order.companyphoto);
            return (
              <div key={order.randomCode} className="rounded-xl border border-border bg-card p-4 shadow-sm cursor-pointer" onClick={() => handleOrderTap(order)}>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1 text-sm">
                    <div className="flex gap-2"><span className="font-semibold text-foreground">{t("Totalitems")}</span><span className="text-foreground">{order.itemCount}</span></div>
                    <div className="flex gap-2"><span className="font-semibold text-foreground">{t("TableNumber")}</span><span className="text-foreground">{order.tableNumber || "—"}</span></div>
                    <div className="flex gap-2"><span className="font-semibold text-foreground">{t("DeliveryType")}</span><span className="text-foreground">{getDeliveryType(order)}</span></div>
                    <div className="flex gap-2"><span className="font-semibold text-foreground">{t("PaymentStatus")}</span><span className="text-foreground">{getPaymentLabel(order)}</span></div>
                    <div className="flex gap-2"><span className="font-semibold text-foreground">{t("DeliveryStatus")}</span><span className="text-foreground">{getDeliveryLabel(order)}</span></div>
                    {order.requestCancel === "1" && (<div className="flex gap-2"><span className="font-semibold text-destructive">{t("RequestCancel")}</span></div>)}
                    <p className="font-bold text-foreground pt-1">{order.companyName}</p>
                    <p className="text-xs text-muted-foreground">{order.dateTime}</p>
                  </div>
                  <div className="w-24 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                    {photoUrl ? (<img src={photoUrl} alt={order.companyName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/30 to-muted flex items-center justify-center"><Store className="text-muted-foreground" size={24} /></div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 mt-4" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" className="flex-1 rounded-full text-sm" disabled={isCancelling || order.requestCancel === "1"} onClick={() => handleCancel(order)}>
                    {isCancelling ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
                    {order.requestCancel === "1" ? t("RequestCancel") : t("REQUESTTOCANCEL")}
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-full text-sm" onClick={() => handleCompanyProfile(order)}>
                    {t("CompanyProfile")}
                  </Button>
                </div>
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                  <Button
                    className="w-full rounded-full text-sm"
                    disabled={order.hasPaid === "1" || payingId === order.randomCode}
                    onClick={() => handlePay(order)}
                  >
                    {payingId === order.randomCode ? (
                      <Loader2 className="animate-spin mr-1" size={14} />
                    ) : null}
                    {order.hasPaid === "1" ? (t("Paid") || "Paid") : (t("Pay") || "Pay")}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Orders;
