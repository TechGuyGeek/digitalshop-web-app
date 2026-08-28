import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Mail, MessageSquare, Phone, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  deleteCompanyOrder, fetchCompanyOrderDetail, groupCompanyOrders,
  toggleCompanyOrderFlag, updateCompanyOrderCancellation, type CompanyOrderBucket, type CompanyGroupedOrder, type CompanyOrderItem,
} from "@/lib/companyOrders";
import { V1ApiError } from "@/lib/v1Api";
import { formatOrderDateTime, getProductPhotoUrl } from "@/lib/orderHistory";
import { buildContactLinks } from "@/lib/companyContact";
import CustomerOrderImage from "@/components/CustomerOrderImage";
import OrderDeleteConfirmation from "@/components/OrderDeleteConfirmation";

function validBucket(value: string | null): CompanyOrderBucket {
  return value === "week" || value === "month" ? value : "today";
}

function contactRows(order: CompanyGroupedOrder): Array<[string, string]> {
  return [
    ["Address line 1", order.customerAddressLine1],
    ["Address line 2", order.customerAddressLine2],
    ["Address line 3", order.customerAddressLine3],
    ["Address line 4", order.customerAddressLine4],
    ["Country", order.customerCountry],
    ["Delivery notes", order.customerDeliveryNotes],
  ].filter(([, value]) => Boolean(value));
}

export default function CompanyOrderDetail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useLanguage();
  const bucket = validBucket(params.get("range"));
  const companyId = params.get("companyid") || "";
  const clientId = params.get("clientid") || "";
  const dateTime = params.get("datetime") || "";
  const [items, setItems] = useState<CompanyOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const loadInFlight = useRef<Promise<void> | null>(null);

  const loadDetail = useCallback(async () => {
    if (loadInFlight.current) return loadInFlight.current;
    if (!companyId || !clientId || !dateTime) {
      setLoading(false);
      setError(t("Therewasanerror"));
      return;
    }
    setLoading(true);
    setError(null);
    const request = fetchCompanyOrderDetail(bucket, companyId, clientId, dateTime)
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof V1ApiError ? err.message : (t("Therewasanerror") || "Unable to load order.")))
      .finally(() => { setLoading(false); loadInFlight.current = null; });
    loadInFlight.current = request;
    return request;
  }, [bucket, clientId, companyId, dateTime, t]);

  useEffect(() => { void loadDetail(); }, [loadDetail]);

  const order = useMemo(() => groupCompanyOrders(items)[0] || null, [items]);
  const links = order ? buildContactLinks(order.customerMobile, order.customerEmail) : { phone: "", sms: "", whatsapp: "", email: "" };
  const cancellationPending = Boolean(order && order.requestCancel === "1" && ["", "none", "requested"].includes(order.cancellationStatus));

  const runMutation = async (action: () => Promise<void>, successMessage = t("SaveSuccessful")) => {
    if (mutating) return;
    setMutating(true);
    try {
      await action();
      await loadDetail();
      toast.success(successMessage);
    } catch (err: unknown) {
      toast.error(err instanceof V1ApiError ? err.message : t("SaveFailed"));
    } finally { setMutating(false); }
  };

  const handleDelete = async () => {
    if (!order || mutating) return;
    setMutating(true);
    try {
      await deleteCompanyOrder(bucket, order);
      toast.success(t("DetailswereSaved"));
      navigate("/company-orders", { replace: true, state: { companyId } });
    } catch (err: unknown) {
      toast.error(err instanceof V1ApiError ? err.message : t("SaveFailed"));
      setMutating(false);
    }
  };

  const openContact = (url: string) => { if (url) window.location.href = url; };
  const mode = order?.needDelivery === "1" ? t("Deliver") : order?.needTakeaway === "1" ? t("TakeAway") : t("OnSite");
  const cancellationLabel = order?.cancellationStatus === "approved" ? "Customer cancellation approved" : order?.cancellationStatus === "rejected" ? "Customer cancellation rejected" : "Customer cancellation requested";

  return <div className="h-dvh bg-muted flex flex-col">
    <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0"><Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate("/company-orders", { state: { companyId } })}><ArrowLeft size={20} /></Button><h1 className="text-lg font-bold text-primary-foreground font-heading truncate">{order?.customerName || "Customer order"}</h1><Button variant="ghost" size="icon" className="ml-auto text-primary-foreground hover:bg-primary/80" onClick={() => void loadDetail()} disabled={loading} aria-label={t("Refresh") || "Refresh"}><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></Button></div>
    {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin" /></div> : error ? <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center"><p className="text-sm text-muted-foreground">{error}</p><Button variant="outline" onClick={() => void loadDetail()}>{t("Refresh") || "Refresh"}</Button></div> : !order ? <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">{t("NoOrdersToshow")}</div> : <>
      <div className="bg-card px-4 py-3 border-b border-border shrink-0 space-y-1 text-sm font-semibold"><div className="flex justify-between"><span>{t("Totalitems")}</span><span>{order.totalItems}</span></div><div className="flex justify-between"><span>{t("TOTALPRICE")}</span><span>{order.totalPrice}</span></div><div className="flex justify-between"><span>{t("DeliveryType")}</span><span>{mode}</span></div><div className="flex justify-between"><span>{t("TableNumber")}</span><span>{order.tableNumber || "—"}</span></div><div className="text-center text-xs font-normal text-muted-foreground">{formatOrderDateTime(order.dateTime)}</div></div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3"><div className="flex items-center gap-3"><CustomerOrderImage path={order.customerImagePath} alt={order.customerName} className="w-16 h-16 rounded-lg shrink-0" iconSize={32} /><div><p className="font-bold">{order.customerName}</p><p className="text-xs text-muted-foreground">{formatOrderDateTime(order.dateTime)}</p></div></div><div className="grid grid-cols-2 gap-2 text-sm"><span>{t("PaymentStatus")}: {order.hasPaid === "1" ? t("Paid") : t("NotPaid")}</span><span>{t("DeliveryStatus")}: {order.hasDelivered === "1" ? t("Delivered") : t("NotDelivered")}</span></div><div className="flex items-center gap-2 text-sm">{order.customerEmailVerified ? <CheckCircle2 size={16} className="text-green-600" /> : <XCircle size={16} className="text-muted-foreground" />}<span>{order.customerEmailVerified ? "Email verified" : "Email not verified"}</span></div><div className="space-y-1 text-sm">{order.customerEmail && <p>{order.customerEmail}</p>}{order.customerMobile && <p>{order.customerMobile}</p>}{contactRows(order).map(([label, value]) => <p key={label}><span className="font-semibold">{label}:</span> {value}</p>)}</div><div className="grid grid-cols-2 gap-3"><Button variant="outline" className="rounded-full" disabled={!links.sms} onClick={() => openContact(links.sms)}><MessageSquare size={16} className="mr-1" />{t("sms")}</Button><Button variant="outline" className="rounded-full" disabled={!links.phone} onClick={() => openContact(links.phone)}><Phone size={16} className="mr-1" />{t("call")}</Button><Button variant="outline" className="rounded-full" disabled={!links.whatsapp} onClick={() => openContact(links.whatsapp)}>WhatsApp</Button><Button variant="outline" className="rounded-full" disabled={!links.email} onClick={() => openContact(links.email)}><Mail size={16} className="mr-1" />{t("Email")}</Button></div></div>
        {order.requestCancel === "1" && <div className={`rounded-xl border px-4 py-3 font-semibold ${order.cancellationStatus === "rejected" ? "border-border bg-card text-muted-foreground" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>{cancellationLabel}{cancellationPending && <div className="flex gap-2 mt-3"><Button size="sm" variant="outline" disabled={mutating} onClick={() => void runMutation(() => updateCompanyOrderCancellation(bucket, order, "rejected"))}>{t("Reject") || "Reject"}</Button><Button size="sm" disabled={mutating} onClick={() => void runMutation(() => updateCompanyOrderCancellation(bucket, order, "approved"))}>{t("Approve") || "Approve"}</Button></div>}</div>}
        {order.items.map((item, index) => { const image = getProductPhotoUrl(item.product_imagepath); const name = String(item.OrderName || "Item"); return <div key={`${item.Productid || "item"}-${index}`} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">{image ? <img src={image} alt={name} className="w-full h-40 object-cover" /> : <div className="px-4 py-3 font-bold">{name}</div>}<div className="px-4 py-3"><div className="flex justify-between font-semibold"><span>{name}</span><span>{item.OrderPrice || "0.00"}</span></div>{item.OrderDesription && <p className="text-sm text-muted-foreground mt-1">{item.OrderDesription}</p>}</div></div>; })}
      </div>
      <div className="px-4 py-3 bg-card border-t border-border shrink-0 space-y-2"><div className="grid grid-cols-2 gap-3"><div className="flex items-center gap-2"><Switch checked={order.hasPaid === "1"} disabled={mutating} onCheckedChange={(checked) => void runMutation(() => toggleCompanyOrderFlag(bucket, "HasPaid", checked ? "1" : "0", order))} /><span className="text-sm">{order.hasPaid === "1" ? t("Paid") : t("NotPaid")}</span></div><div className="flex items-center gap-2"><Switch checked={order.hasDelivered === "1"} disabled={mutating} onCheckedChange={(checked) => void runMutation(() => toggleCompanyOrderFlag(bucket, "HasDelivered", checked ? "1" : "0", order))} /><span className="text-sm">{order.hasDelivered === "1" ? t("Delivered") : t("NotDelivered")}</span></div></div><Button variant="destructive" className="w-full rounded-full" disabled={mutating} onClick={() => setDeleteConfirmOpen(true)}>{mutating ? <Loader2 className="animate-spin mr-1" size={14} /> : null}{t("Delete") || "Delete Order"}</Button></div>
      <OrderDeleteConfirmation open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} description={`${order.customerName} — ${formatOrderDateTime(order.dateTime)}`} busy={mutating} onConfirm={() => void handleDelete()} />
    </>}
  </div>;
}
