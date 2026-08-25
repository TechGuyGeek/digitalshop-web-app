import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  deleteCompanyOrder, fetchCompanyOrdersByTab, groupCompanyOrders,
  toggleCompanyOrderFlag, updateCompanyOrderCancellation, type CompanyGroupedOrder, type CompanyOrderBucket,
} from "@/lib/companyOrders";
import { V1ApiError } from "@/lib/v1Api";
import { formatOrderDateTime } from "@/lib/orderHistory";
import CustomerOrderImage from "@/components/CustomerOrderImage";
import ProfileHelpAssistant from "@/components/ProfileHelpAssistant";

const CompanyOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const passedCompanyId = String((location.state as { companyId?: string } | null)?.companyId || "");
  const companyId = passedCompanyId || localStorage.getItem("companyOrdersCompanyId") || "";
  const [activeTab, setActiveTab] = useState<CompanyOrderBucket>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<CompanyGroupedOrder[]>([]);
  const [mutatingKey, setMutatingKey] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CompanyGroupedOrder | null>(null);
  const loadInFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (passedCompanyId) localStorage.setItem("companyOrdersCompanyId", passedCompanyId);
  }, [passedCompanyId]);

  const loadOrders = useCallback(async (bucket: CompanyOrderBucket = activeTab) => {
    if (loadInFlight.current) return loadInFlight.current;
    if (!companyId) {
      setLoading(false);
      setError(t("Therewasanerror"));
      return;
    }
    setLoading(true);
    setError(null);
    const request = fetchCompanyOrdersByTab(companyId, bucket)
      .then((rows) => setOrders(groupCompanyOrders(rows)))
      .catch((err: unknown) => {
        setOrders([]);
        setError(err instanceof V1ApiError ? err.message : (t("Therewasanerror") || "Unable to load company orders."));
      })
      .finally(() => { setLoading(false); loadInFlight.current = null; });
    loadInFlight.current = request;
    return request;
  }, [activeTab, companyId, t]);

  useEffect(() => { void loadOrders(activeTab); }, [activeTab, loadOrders]);

  const handleToggle = async (order: CompanyGroupedOrder, flag: "HasPaid" | "HasDelivered", value: boolean) => {
    const key = `${order.groupKey}-${flag}`;
    if (mutatingKey) return;
    setMutatingKey(key);
    try {
      await toggleCompanyOrderFlag(activeTab, flag, value ? "1" : "0", order);
      await loadOrders(activeTab);
      toast.success(t("SaveSuccessful"));
    } catch (err: unknown) {
      toast.error(err instanceof V1ApiError ? err.message : t("SaveFailed"));
    } finally { setMutatingKey(null); }
  };

  const handleCancellation = async (order: CompanyGroupedOrder, status: "approved" | "rejected") => {
    const key = `${order.groupKey}-cancellation`;
    if (mutatingKey) return;
    setMutatingKey(key);
    try {
      await updateCompanyOrderCancellation(activeTab, order, status);
      await loadOrders(activeTab);
      toast.success(t("SaveSuccessful"));
    } catch (err: unknown) {
      toast.error(err instanceof V1ApiError ? err.message : t("SaveFailed"));
    } finally { setMutatingKey(null); }
  };

  const handleDelete = async (order: CompanyGroupedOrder) => {
    if (mutatingKey) return;
    setDeleteConfirm(null);
    setMutatingKey(`${order.groupKey}-delete`);
    try {
      await deleteCompanyOrder(activeTab, order);
      await loadOrders(activeTab);
      toast.success(t("DetailswereSaved"));
    } catch (err: unknown) {
      toast.error(err instanceof V1ApiError ? err.message : t("SaveFailed"));
    } finally { setMutatingKey(null); }
  };

  const deliveryType = (order: CompanyGroupedOrder) => {
    if (order.needDelivery === "1") return t("Deliver");
    if (order.needTakeaway === "1") return t("TakeAway");
    return t("OnSite");
  };

  const tabs: { key: CompanyOrderBucket; label: string }[] = [
    { key: "today", label: t("Today") },
    { key: "week", label: t("Week") },
    { key: "month", label: t("Month") },
  ];

  return (
    <div className="h-dvh bg-muted flex flex-col">
      <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate("/company-profile")}><ArrowLeft size={20} /></Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">{t("LiveOrdersPageTitle")}</h1>
        <Button variant="ghost" size="icon" className="ml-auto text-primary-foreground hover:bg-primary/80" onClick={() => void loadOrders(activeTab)} disabled={loading} aria-label={t("Refresh") || "Refresh"}><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></Button>
      </div>
      <div className="flex border-b border-border bg-card shrink-0">{tabs.map((tab) => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${activeTab === tab.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>{tab.label}</button>)}</div>
      <div className="bg-card px-4 py-2 shrink-0"><p className="text-center text-sm font-semibold text-foreground">{t("Orders")}</p></div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <ProfileHelpAssistant translationKey="HELPLIVEORSERSNOPIC" />
        {loading ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Loader2 className="animate-spin mb-4" size={32} /><p className="text-sm">{t("Pleasewait")}</p></div>
          : error ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4"><p className="text-sm text-center">{error}</p><Button variant="outline" onClick={() => void loadOrders(activeTab)}>{t("Refresh") || "Refresh"}</Button></div>
          : orders.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><span className="text-4xl mb-4">📦</span><p className="text-sm">{t("NoOrdersToshow")}</p></div>
          : orders.map((order) => {
            const paidKey = `${order.groupKey}-HasPaid`;
            const deliveredKey = `${order.groupKey}-HasDelivered`;
            const cancellationPending = order.requestCancel === "1" && ["", "none", "requested"].includes(order.cancellationStatus);
            const cancellationLabel = order.cancellationStatus === "approved" ? "Customer cancellation approved" : order.cancellationStatus === "rejected" ? "Customer cancellation rejected" : t("RequestCancel");
            return <div key={order.groupKey} className="rounded-xl border border-border bg-card p-4 shadow-sm cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { const params = new URLSearchParams({ id: order.orderId, companyid: order.companyId, clientid: order.clientId, datetime: order.dateTime, range: activeTab }); navigate(`/company-order-detail?${params.toString()}`); }}>
              <div className="flex gap-3"><div className="flex-1 space-y-1 text-sm">
                <div className="flex gap-2"><span className="font-semibold">{t("Totalitems")}</span><span>{order.totalItems}</span></div>
                <div className="flex gap-2"><span className="font-semibold">{t("TOTALPRICE")}</span><span>{order.totalPrice}</span></div>
                <div className="flex gap-2"><span className="font-semibold">{t("TableNumber")}</span><span>{order.tableNumber || "—"}</span></div>
                <div className="flex gap-2"><span className="font-semibold">{t("DeliveryType")}</span><span>{deliveryType(order)}</span></div>
                <div className="flex items-center gap-2 pt-1" onClick={(event) => event.stopPropagation()}><Switch checked={order.hasPaid === "1"} disabled={mutatingKey === paidKey} onCheckedChange={(checked) => void handleToggle(order, "HasPaid", checked)} /><span>{order.hasPaid === "1" ? t("Paid") : t("NotPaid")}</span></div>
                <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}><Switch checked={order.hasDelivered === "1"} disabled={mutatingKey === deliveredKey} onCheckedChange={(checked) => void handleToggle(order, "HasDelivered", checked)} /><span>{order.hasDelivered === "1" ? t("Delivered") : t("NotDelivered")}</span></div>
                {order.requestCancel === "1" && <div className="flex gap-2"><span className={`font-semibold ${order.cancellationStatus === "rejected" ? "text-muted-foreground" : "text-destructive"}`}>{cancellationLabel}</span></div>}
                {cancellationPending && <div className="flex gap-2" onClick={(event) => event.stopPropagation()}><Button size="sm" variant="outline" disabled={Boolean(mutatingKey)} onClick={() => void handleCancellation(order, "rejected")}>{t("Reject") || "Reject"}</Button><Button size="sm" disabled={Boolean(mutatingKey)} onClick={() => void handleCancellation(order, "approved")}>{t("Approve") || "Approve"}</Button></div>}
                <p className="font-bold pt-1">{order.customerName}</p><p className="text-xs text-muted-foreground">{formatOrderDateTime(order.dateTime)}</p>
              </div><div className="flex flex-col items-end gap-2 shrink-0"><CustomerOrderImage path={order.customerImagePath} alt={order.customerName} className="w-20 h-16 rounded-lg" /><CustomerOrderImage path={order.items.find((item) => String(item.product_imagepath || "").trim())?.product_imagepath} alt="Purchased product" variant="product" className="w-20 h-16 rounded-lg" iconSize={22} /></div></div>
              <div className="mt-4" onClick={(event) => event.stopPropagation()}><Button variant="outline" size="sm" className="w-full rounded-md text-xs" disabled={mutatingKey === `${order.groupKey}-delete`} onClick={() => setDeleteConfirm(order)}>{mutatingKey === `${order.groupKey}-delete` ? <Loader2 className="animate-spin" size={14} /> : t("Delete")}</Button></div>
            </div>;
          })}
      </div>
      {deleteConfirm && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setDeleteConfirm(null)}><div className="bg-card rounded-xl p-6 max-w-sm w-full shadow-lg" onClick={(event) => event.stopPropagation()}><p className="text-foreground font-semibold mb-2">{t("Areyousureyouwanttodelete")}</p><p className="text-sm text-muted-foreground mb-4">{deleteConfirm.customerName} — {formatOrderDateTime(deleteConfirm.dateTime)}</p><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>{t("Cancel")}</Button><Button variant="destructive" className="flex-1" onClick={() => void handleDelete(deleteConfirm)}>{t("Delete")}</Button></div></div></div>}
    </div>
  );
};

export default CompanyOrders;
