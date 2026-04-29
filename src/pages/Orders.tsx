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

const Orders = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [todayOrders, setTodayOrders] = useState<GroupedOrder[]>([]);
  const [weekOrders, setWeekOrders] = useState<GroupedOrder[]>([]);
  const [monthOrders, setMonthOrders] = useState<GroupedOrder[]>([]);

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

  const handlePay = (order: GroupedOrder) => {
    if (order.hasPaid === "1") return;
    toast.info(
      t("PaymentMethodComingSoon") ||
        "Payments aren't set up yet. Open the menu and tap 'My Payment Methods' to get started.",
    );
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
                    disabled={order.hasPaid === "1"}
                    onClick={() => handlePay(order)}
                  >
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
