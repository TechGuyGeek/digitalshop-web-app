import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegisterNavActions } from "@/contexts/SiteNavExtras";
import ProfileHelpAssistant from "@/components/ProfileHelpAssistant";
import {
  fetchOrdersToday, fetchOrdersWeek, fetchOrdersMonth, formatOrderDateTime,
  customerCancellationLabel, getCompanyPhotoUrl, groupOrdersBySession, isSessionError, requestCancelOrder,
  type GroupedOrder, type OrderBucket, V1ApiError,
} from "@/lib/orderHistory";

const Orders = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<OrderBucket>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [todayOrders, setTodayOrders] = useState<GroupedOrder[]>([]);
  const [weekOrders, setWeekOrders] = useState<GroupedOrder[]>([]);
  const [monthOrders, setMonthOrders] = useState<GroupedOrder[]>([]);
  const loadInFlight = useRef<Promise<void> | null>(null);

  const loadOrders = useCallback(async () => {
    if (loadInFlight.current) return loadInFlight.current;
    setLoading(true);
    setError(null);
    const request = Promise.all([fetchOrdersToday(), fetchOrdersWeek(), fetchOrdersMonth()])
      .then(([today, week, month]) => {
        setTodayOrders(groupOrdersBySession(today));
        setWeekOrders(groupOrdersBySession(week));
        setMonthOrders(groupOrdersBySession(month));
      })
      .catch((err: unknown) => {
        setError(isSessionError(err) ? t("Signin") : err instanceof V1ApiError ? err.message : (t("Pleasecheckyourinternetconnection") || "Unable to load orders."));
      })
      .finally(() => { setLoading(false); loadInFlight.current = null; });
    loadInFlight.current = request;
    return request;
  }, [t]);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  useRegisterNavActions("orders-payment", [{
    id: "payment-methods",
    label: t("MyPaymentMethods") || "My Payment Methods",
    onClick: () => navigate("/payment-methods"),
  }], [t, navigate]);

  const currentOrders = activeTab === "today" ? todayOrders : activeTab === "week" ? weekOrders : monthOrders;
  const tabs: { key: OrderBucket; label: string }[] = [
    { key: "today", label: t("Today") }, { key: "week", label: t("Week") }, { key: "month", label: t("Month") },
  ];

  const handleCancel = async (order: GroupedOrder) => {
    if (cancellingId || order.requestCancel === "1" || !order.orderId) return;
    setCancellingId(order.randomCode);
    try {
      await requestCancelOrder(order, activeTab);
      toast.success(t("Requestwassent") || t("DetailswereSaved"));
      await loadOrders();
    } catch (err: unknown) {
      toast.error(isSessionError(err) ? t("Signin") : err instanceof V1ApiError ? err.message : (t("SaveFailed") || "Unable to cancel order."));
    } finally { setCancellingId(null); }
  };

  const handleOrderTap = (order: GroupedOrder) => {
    const query = new URLSearchParams({ companyid: order.companyId, clientid: order.clientId, datetime: order.dateTime });
    const route = activeTab === "today" ? "/order-detail" : activeTab === "week" ? "/order-detail-week" : "/order-detail-month";
    navigate(`${route}?${query.toString()}`, { state: { order } });
  };

  const handleCompanyProfile = (order: GroupedOrder) => {
    navigate("/company-profile-readonly", { state: { company: order } });
  };

  const deliveryType = (order: GroupedOrder) => order.needDelivery === "1" ? t("Deliver") : order.needTakeaway === "1" ? t("TakeAway") : t("OnSite");

  return (
    <div className="h-dvh bg-muted flex flex-col">
      <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate("/profile")}><ArrowLeft size={20} /></Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">{t("Orders")}</h1>
        <Button variant="ghost" size="icon" className="ml-auto text-primary-foreground hover:bg-primary/80" onClick={() => void loadOrders()} disabled={loading} aria-label={t("Refresh") || "Refresh"}><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></Button>
      </div>
      <div className="flex border-b border-border bg-card shrink-0">{tabs.map((tab) => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${activeTab === tab.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>{tab.label}</button>)}</div>
      <div className="bg-card px-4 py-2 shrink-0"><p className="text-center text-sm font-semibold text-foreground">{t("Orders")}</p></div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <ProfileHelpAssistant translationKey="HELPORDERHISTORYANDROID" />
        {loading ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Loader2 className="animate-spin mb-4" size={32} /><p className="text-sm">{t("Pleasewait")}</p></div>
          : error ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4"><p className="text-sm text-center">{error}</p><Button variant="outline" className="rounded-full" onClick={() => void loadOrders()}>{t("Refresh") || "Refresh"}</Button></div>
          : currentOrders.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><span className="text-4xl mb-4">📦</span><p className="text-sm">{t("NoOrdersToshow")}</p></div>
          : currentOrders.map((order) => {
            const cancelling = cancellingId === order.randomCode;
            return <div key={order.randomCode} className="rounded-xl border border-border bg-card p-4 shadow-sm cursor-pointer" onClick={() => handleOrderTap(order)}>
              <div className="flex gap-3"><div className="flex-1 space-y-1 text-sm">
                <div className="flex gap-2"><span className="font-semibold">{t("Totalitems")}</span><span>{order.itemCount}</span></div>
                <div className="flex gap-2"><span className="font-semibold">{t("TableNumber")}</span><span>{order.tableNumber || "—"}</span></div>
                <div className="flex gap-2"><span className="font-semibold">{t("DeliveryType")}</span><span>{deliveryType(order)}</span></div>
                <div className="flex gap-2"><span className="font-semibold">{t("PaymentStatus")}</span><span>{order.hasPaid === "1" ? t("Paid") : t("NotPaid")}</span></div>
                <div className="flex gap-2"><span className="font-semibold">{t("DeliveryStatus")}</span><span>{order.hasDelivered === "1" ? t("Delivered") : t("NotDelivered")}</span></div>
                {order.requestCancel === "1" && <p className={`font-semibold ${order.cancellationStatus === "rejected" ? "text-muted-foreground" : "text-destructive"}`}>{customerCancellationLabel(order.cancellationStatus, order.requestCancel === "1", t)}</p>}
                <p className="font-bold pt-1">{order.companyName}</p><p className="text-xs text-muted-foreground">{formatOrderDateTime(order.dateTime)}</p>
              </div><div className="w-24 h-20 rounded-lg bg-muted overflow-hidden shrink-0">{getCompanyPhotoUrl(order.companyImagePath) ? <img src={getCompanyPhotoUrl(order.companyImagePath)} alt={order.companyName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Store className="text-muted-foreground" size={24} /></div>}</div></div>
              <div className="flex gap-3 mt-4" onClick={(event) => event.stopPropagation()}><Button variant="outline" className="flex-1 rounded-full" disabled={cancelling || order.requestCancel === "1"} onClick={() => void handleCancel(order)}>{cancelling && <Loader2 className="animate-spin mr-1" size={14} />}{order.requestCancel === "1" ? t("RequestCancel") : t("REQUESTTOCANCEL")}</Button><Button variant="outline" className="flex-1 rounded-full" onClick={() => handleCompanyProfile(order)}>{t("CompanyProfile")}</Button></div>
            </div>;
          })}
      </div>
    </div>
  );
};

export default Orders;
