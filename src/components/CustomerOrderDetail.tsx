import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, QrCode, RefreshCw, Store } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  customerCancellationLabel, fetchCustomerOrderDetail, formatOrderDateTime, getProductPhotoUrl, groupOrdersBySession,
  isSessionError, isTrustedOrderReference, requestCancelOrder, type GroupedOrder, type OrderBucket,
  type OrderSummary, V1ApiError,
} from "@/lib/orderHistory";
import { buildOrderQrPayload, createV1OrderQr } from "@/lib/v1Api";

interface CustomerOrderDetailProps { bucket: OrderBucket; }

export default function CustomerOrderDetail({ bucket }: CustomerOrderDetailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { t } = useLanguage();
  const companyId = params.get("companyid") || "";
  const clientId = params.get("clientid") || "";
  const requestedDateTime = params.get("datetime") || "";
  const [items, setItems] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelledLocally, setCancelledLocally] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const loadInFlight = useRef<Promise<void> | null>(null);

  const loadDetails = useCallback(async () => {
    if (loadInFlight.current) return loadInFlight.current;
    if (!companyId || !requestedDateTime) { setLoading(false); return; }
    setLoading(true); setError(null);
    const request = fetchCustomerOrderDetail(bucket, companyId, clientId, requestedDateTime)
      .then((nextItems) => { setItems(nextItems); if (nextItems.some((item) => item.RequestCancel === "1")) setCancelledLocally(true); })
      .catch((err: unknown) => setError(isSessionError(err) ? t("Signin") : err instanceof V1ApiError ? err.message : (t("Pleasecheckyourinternetconnection") || "Unable to load order.")))
      .finally(() => { setLoading(false); loadInFlight.current = null; });
    loadInFlight.current = request;
    return request;
  }, [bucket, clientId, companyId, requestedDateTime, t]);

  useEffect(() => { void loadDetails(); }, [loadDetails]);

  const grouped = useMemo(() => groupOrdersBySession(items)[0], [items]);
  const first = items[0];
  const serverDateTime = String(first?.DateandTime || requestedDateTime);
  const orderReference = String(grouped?.reference || first?.RandomeCode || "");
  const total = items.reduce((sum, item) => sum + (Number(item.OrderPrice) || 0), 0);
  const totalItems = items.length;
  const mode = first?.NeedDelivery === "1" ? t("Deliver") : first?.NeedTakeaway === "1" ? t("TakeAway") : t("OnSite");
  const passedOrder = (location.state as { order?: GroupedOrder } | null)?.order;
  const companyForProfile = grouped || passedOrder;
  const cancellationStatus = grouped?.cancellationStatus || "none";
  const cancellationRequested = first?.RequestCancel === "1" || cancelledLocally || cancellationStatus !== "none";

  const handleCancel = async () => {
    if (!grouped || cancelling || grouped.requestCancel === "1" || !grouped.orderId) return;
    setCancelling(true);
    try {
      await requestCancelOrder(grouped, bucket);
      setCancelledLocally(true);
      toast.success(t("Requestwassent") || t("DetailswereSaved"));
      await loadDetails();
    } catch (err: unknown) {
      toast.error(isSessionError(err) ? t("Signin") : err instanceof V1ApiError ? err.message : (t("SaveFailed") || "Unable to cancel order."));
    } finally { setCancelling(false); }
  };

  const showQr = async () => {
    if (!isTrustedOrderReference(orderReference) || qrLoading) return;
    setQrLoading(true);
    try {
      const result = await createV1OrderQr(orderReference);
      setQrToken(String(result.token || ""));
    } catch (err: unknown) {
      toast.error(isSessionError(err) ? t("Signin") : err instanceof V1ApiError ? err.message : (t("SaveFailed") || "QR unavailable."));
    } finally { setQrLoading(false); }
  };

  return <div className="h-dvh bg-muted flex flex-col">
    <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0">
      <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate("/orders")}><ArrowLeft size={20} /></Button>
      <h1 className="text-lg font-bold text-primary-foreground font-heading truncate">{grouped?.companyName || passedOrder?.companyName || t("UserOrderDetails")}</h1>
      <Button variant="ghost" size="icon" className="ml-auto text-primary-foreground hover:bg-primary/80" onClick={() => void loadDetails()} disabled={loading} aria-label={t("Refresh") || "Refresh"}><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></Button>
    </div>
    {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin" /></div> : error ? <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center"><p className="text-sm text-muted-foreground">{error}</p><Button variant="outline" onClick={() => void loadDetails()}>{t("Refresh") || "Refresh"}</Button></div> : items.length === 0 ? <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">{t("NoOrdersToshow")}</div> : <>
      <div className="bg-card px-4 py-3 border-b border-border shrink-0 space-y-1 text-sm font-semibold">
        <div className="flex justify-between"><span>{t("Totalitems")}</span><span>{totalItems}</span></div>
        <div className="flex justify-between"><span>{t("TOTALPRICE")}</span><span>£{total.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>{t("DeliveryType")}</span><span>{mode}</span></div>
        <div className="flex justify-between"><span>{t("TableNumber")}</span><span>{first?.TableNumber || "—"}</span></div>
        <div className="text-center text-xs font-normal text-muted-foreground">{formatOrderDateTime(serverDateTime)}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-3"><div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">{grouped?.companyImagePath ? <img src={getProductPhotoUrl(grouped.companyImagePath)} alt={grouped.companyName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Store size={22} className="text-muted-foreground" /></div>}</div><div><p className="font-bold">{grouped?.companyName}</p><p className="text-xs text-muted-foreground">{formatOrderDateTime(serverDateTime)}</p></div></div>
          <div className="grid grid-cols-2 gap-2 text-sm"><span>{t("PaymentStatus")}: {first?.HasPaid === "1" ? t("Paid") : t("NotPaid")}</span><span>{t("DeliveryStatus")}: {first?.HasDelivered === "1" ? t("Delivered") : t("NotDelivered")}</span></div>
          {cancellationRequested && <p className={`font-semibold ${cancellationStatus === "rejected" ? "text-muted-foreground" : "text-destructive"}`}>{customerCancellationLabel(cancellationStatus, cancellationRequested, t)}</p>}
          {companyForProfile && <Button variant="outline" className="w-full rounded-full" onClick={() => navigate("/company-profile-readonly", { state: { company: companyForProfile } })}>{t("CompanyProfile")}</Button>}
        </div>
        {items.map((item, index) => { const image = getProductPhotoUrl(String(item.product_imagepath || "")); const name = String(item.OrderName || "Item"); return <div key={`${item.Productid || item.productid || "item"}-${index}`} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">{image ? <img src={image} alt={name} className="w-full h-40 object-cover" /> : <div className="px-4 py-3 flex items-center gap-2"><Store size={18} className="text-muted-foreground" /><span className="font-bold">{name}</span></div>}<div className="px-4 py-3"><div className="flex justify-between font-semibold"><span>{name}</span><span>£{Number(item.OrderPrice || 0).toFixed(2)}</span></div>{item.OrderDesription && <p className="text-sm text-muted-foreground mt-1">{String(item.OrderDesription)}</p>}</div></div>; })}
        {isTrustedOrderReference(orderReference) && <div className="rounded-xl border border-border bg-card p-4 space-y-3"><Button variant="outline" className="w-full rounded-full" onClick={() => void showQr()} disabled={qrLoading}><QrCode size={16} className="mr-2" />{qrLoading ? (t("Pleasewait") || "Please wait") : "Show Order QR"}</Button>{qrToken && <div className="flex flex-col items-center gap-2"><QRCodeCanvas value={buildOrderQrPayload(qrToken)} size={220} includeMargin /><p className="text-xs text-center text-muted-foreground">Show this QR code to the shop.</p></div>}</div>}
      </div>
      <div className="px-4 py-3 bg-card border-t border-border shrink-0"><Button className="w-full rounded-full" disabled={cancelling || cancellationRequested || first?.HasPaid === "1" || first?.HasDelivered === "1"} onClick={() => void handleCancel()}>{cancelling && <Loader2 className="animate-spin mr-1" size={14} />}{cancellationRequested ? customerCancellationLabel(cancellationStatus, cancellationRequested, t) : t("REQUESTTOCANCEL")}</Button></div>
    </>}
  </div>;
}
