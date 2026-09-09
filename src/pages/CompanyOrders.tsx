import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, QrCode, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  deleteCompanyOrder, fetchCompanyOrdersByTab, groupCompanyOrders,
  isTrustedCompanyOrderReference, toggleCompanyOrderFlag, updateCompanyOrderCancellation, type CompanyGroupedOrder, type CompanyOrderBucket,
} from "@/lib/companyOrders";
import { V1ApiError } from "@/lib/v1Api";
import { formatOrderDateTime } from "@/lib/orderHistory";
import CustomerOrderImage from "@/components/CustomerOrderImage";
import ProfileHelpAssistant from "@/components/ProfileHelpAssistant";
import OrderDeleteConfirmation from "@/components/OrderDeleteConfirmation";

const CompanyOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { t } = useLanguage();
  const passedCompanyId = String((location.state as { companyId?: string } | null)?.companyId || "");
  const companyId = passedCompanyId || params.get("companyid") || localStorage.getItem("companyOrdersCompanyId") || "";
  const scanReference = params.get("scan_reference") || "";
  const [activeTab, setActiveTab] = useState<CompanyOrderBucket>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<CompanyGroupedOrder[]>([]);
  const [mutatingKey, setMutatingKey] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CompanyGroupedOrder | null>(null);
  const [hideUnverified, setHideUnverified] = useState(false);
  const loadInFlight = useRef<Promise<void> | null>(null);
  const scanInFlight = useRef("");

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

  useEffect(() => { if (!scanReference) void loadOrders(activeTab); }, [activeTab, loadOrders, scanReference]);

  useEffect(() => {
    if (!scanReference || !companyId || scanInFlight.current === scanReference) return;
    if (!isTrustedCompanyOrderReference(scanReference)) { setLoading(false); setError(t("Therewasanerror")); return; }
    scanInFlight.current = scanReference;
    setLoading(true); setError(null);
    void Promise.all((['today', 'week', 'month'] as CompanyOrderBucket[]).map(async (bucket) => ({ bucket, orders: groupCompanyOrders(await fetchCompanyOrdersByTab(companyId, bucket)) })))
      .then((buckets) => {
        const found = buckets.flatMap(({ bucket, orders: grouped }) => grouped.map((order) => ({ bucket, order }))).find(({ order }) => order.reference === scanReference);
        if (!found) { setLoading(false); setError(t("Therewasanerror")); return; }
        const query = new URLSearchParams({ companyid: found.order.companyId, clientid: found.order.clientId, datetime: found.order.dateTime, range: found.bucket });
        navigate(`/company-order-detail?${query.toString()}`, { replace: true });
      })
      .catch((err: unknown) => { setLoading(false); setError(err instanceof V1ApiError ? err.message : t("Therewasanerror")); });
  }, [companyId, navigate, scanReference, t]);

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
      <div className="bg-card px-4 py-2 border-b border-border shrink-0 grid grid-cols-2 gap-2"><Button variant="outline" className="w-full rounded-full" onClick={() => navigate(`/qr-scanner?mode=order&companyid=${encodeURIComponent(companyId)}`)}><QrCode size={16} className="mr-2" />{t("ScanOrderQr")}</Button><Button variant="outline" className="w-full rounded-full" onClick={() => navigate(`/customer-moderation?companyid=${encodeURIComponent(companyId)}`)}><Shield size={16} className="mr-2" />Manage Customers</Button></div>
      <div className="flex border-b border-border bg-card shrink-0">{tabs.map((tab) => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${activeTab === tab.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>{tab.label}</button>)}</div>
      <div className="bg-card px-4 py-2 shrink-0 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-foreground">{t("Orders")}</p><label className="flex items-center gap-2 text-xs text-muted-foreground"><span>Hide unverified</span><Switch checked={hideUnverified} onCheckedChange={setHideUnverified} /></label></div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <ProfileHelpAssistant translationKey="HELPLIVEORSERSNOPIC" />
        {loading ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Loader2 className="animate-spin mb-4" size={32} /><p className="text-sm">{t("Pleasewait")}</p></div>
          : error ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4"><p className="text-sm text-center">{error}</p><Button variant="outline" onClick={() => void loadOrders(activeTab)}>{t("Refresh") || "Refresh"}</Button></div>
          : orders.filter((order) => !hideUnverified || order.customerEmailVerified).length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><span className="text-4xl mb-4">📦</span><p className="text-sm">{t("NoOrdersToshow")}</p></div>
          : orders.filter((order) => !hideUnverified || order.customerEmailVerified).map((order) => {
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
              </div><CustomerOrderImage path={order.customerImagePath} alt={order.customerName} className="w-20 h-16 rounded-lg shrink-0" /></div>
              <div className="mt-4 grid grid-cols-2 gap-2" onClick={(event) => event.stopPropagation()}><Button variant="outline" size="sm" className="w-full rounded-md text-xs" disabled={mutatingKey === `${order.groupKey}-delete`} onClick={() => setDeleteConfirm(order)}>{mutatingKey === `${order.groupKey}-delete` ? <Loader2 className="animate-spin" size={14} /> : t("Delete")}</Button><Button variant="outline" size="sm" className="w-full rounded-md text-xs" disabled={!order.hasCanonicalReference} onClick={() => navigate(`/customer-profile-readonly?orderid=${encodeURIComponent(order.reference)}`)}>Customer</Button></div>
            </div>;
          })}
      </div>
      <OrderDeleteConfirmation open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)} description={deleteConfirm ? `${deleteConfirm.customerName} — ${formatOrderDateTime(deleteConfirm.dateTime)}` : ""} busy={Boolean(mutatingKey)} onConfirm={() => deleteConfirm && void handleDelete(deleteConfirm)} />
    </div>
  );
};

export default CompanyOrders;
