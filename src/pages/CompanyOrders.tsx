import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DigitalPerson } from "@/lib/api";
import { fetchCompanyOrdersByTab, groupCompanyOrders, toggleCompanyOrderFlag, deleteCompanyOrder, type CompanyGroupedOrder } from "@/lib/companyOrders";

type TabKey = "today" | "week" | "month";

const CompanyOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const passedCompanyId = (location.state as any)?.companyId || "";

  useEffect(() => { if (passedCompanyId) localStorage.setItem("companyOrdersCompanyId", passedCompanyId); }, [passedCompanyId]);

  const savedCompanyId = passedCompanyId || localStorage.getItem("companyOrdersCompanyId") || "";
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [orders, setOrders] = useState<CompanyGroupedOrder[]>([]);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CompanyGroupedOrder | null>(null);

  const TABS: { key: TabKey; label: string }[] = [
    { key: "today", label: t("Today") },
    { key: "week", label: t("Week") },
    { key: "month", label: t("Month") },
  ];

  const getAuth = () => {
    try {
      const stored = localStorage.getItem("digitalUser"); if (!stored) return null;
      const u = JSON.parse(stored) as DigitalPerson;
      const personId = String(u.PersonID || u.ID || ""); const email = String(u.Email || u.email || "");
      const password = String(u.Password || u.password || "");
      const companyId = savedCompanyId || String(u.CompanyID || (u as any).companyID || (u as any).companyid || "");
      if (!personId || !companyId || companyId === "0") return null;
      return { personId, email, password, companyId };
    } catch { return null; }
  };

  const loadOrders = useCallback(async (tab: TabKey) => {
    const auth = getAuth();
    if (!auth) { setLoading(false); setError(true); toast.error(t("Therewasanerror")); return; }
    setLoading(true); setError(false);
    try { const raw = await fetchCompanyOrdersByTab(auth.personId, auth.email, auth.password, auth.companyId, tab); setOrders(groupCompanyOrders(raw)); }
    catch { setError(true); setOrders([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOrders(activeTab); }, [activeTab, loadOrders]);

  const handleToggle = async (order: CompanyGroupedOrder, flag: "HasPaid" | "HasDelivered", newValue: boolean) => {
    const auth = getAuth(); if (!auth) return;
    const toggleId = `${order.groupKey}-${flag}`; setTogglingKey(toggleId);
    const prevOrders = [...orders];
    setOrders((prev) => prev.map((o) => o.groupKey === order.groupKey ? { ...o, [flag === "HasPaid" ? "hasPaid" : "hasDelivered"]: newValue ? "1" : "0" } : o));
    const result = await toggleCompanyOrderFlag(activeTab, flag, newValue ? "1" : "0", order, auth.personId, auth.email, auth.password);
    if (result === null) { setOrders(prevOrders); toast.error(t("SaveFailed")); }
    else { await loadOrders(activeTab); toast.success(t("SaveSuccessful")); }
    setTogglingKey(null);
  };

  const handleDeleteOrder = async (order: CompanyGroupedOrder) => {
    const auth = getAuth(); if (!auth) return;
    setDeleteConfirm(null);
    setDeletingKey(order.groupKey);
    console.log("[deleteOrder] clicked, groupKey:", order.groupKey, "companyId:", order.companyId, "clientId:", order.clientId);
    const result = await deleteCompanyOrder(activeTab, order, auth.personId, auth.email, auth.password);
    if (result.success) {
      toast.success(result.message || t("DetailswereSaved"));
      await loadOrders(activeTab);
    } else {
      toast.error(result.message || t("SaveFailed"));
    }
    setDeletingKey(null);
  };

  const getDeliveryType = (order: CompanyGroupedOrder) => {
    if (order.needDelivery === "1") return t("Deliver");
    if (order.needTakeaway === "1") return t("TakeAway");
    return t("OnSite");
  };

  return (
    <div className="h-screen bg-muted flex flex-col">
      <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate("/company-profile")}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">{t("LiveOrdersPageTitle")}</h1>
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
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Loader2 className="animate-spin mb-4" size={32} /><p className="text-sm">{t("Pleasewait")}</p></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><span className="text-4xl mb-4">⚠️</span><p className="text-sm">{t("Therewasanerror")}</p></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><span className="text-4xl mb-4">📦</span><p className="text-sm">{t("NoOrdersToshow")}</p></div>
        ) : (
          orders.map((order) => {
            const paidToggleId = `${order.groupKey}-HasPaid`;
            const deliveredToggleId = `${order.groupKey}-HasDelivered`;
            return (
              <div key={order.groupKey} className="rounded-xl border border-border bg-card p-4 shadow-sm cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => { const params = new URLSearchParams({ companyid: order.companyId, clientid: order.clientId, datetime: order.dateTime, range: activeTab }); navigate(`/company-order-detail?${params.toString()}`); }}>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1 text-sm">
                    <div className="flex gap-2"><span className="font-semibold text-foreground">{t("Totalitems")}</span><span className="text-foreground">{order.totalItems}</span></div>
                    <div className="flex gap-2"><span className="font-semibold text-foreground">{t("TOTALPRICE")}</span><span className="text-foreground">{order.totalPrice}</span></div>
                    <div className="flex gap-2"><span className="font-semibold text-foreground">{t("TableNumber")}</span><span className="text-foreground">{order.tableNumber || "—"}</span></div>
                    <div className="flex gap-2"><span className="font-semibold text-foreground">{t("DeliveryType")}</span><span className="text-foreground">{getDeliveryType(order)}</span></div>
                    <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <Switch checked={order.hasPaid === "1"} disabled={togglingKey === paidToggleId} onCheckedChange={(checked) => handleToggle(order, "HasPaid", checked)} />
                      <span className="text-foreground">{order.hasPaid === "1" ? t("Paid") : t("NotPaid")}</span>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Switch checked={order.hasDelivered === "1"} disabled={togglingKey === deliveredToggleId} onCheckedChange={(checked) => handleToggle(order, "HasDelivered", checked)} />
                      <span className="text-foreground">{order.hasDelivered === "1" ? t("Delivered") : t("NotDelivered")}</span>
                    </div>
                    {order.requestCancel === "1" && (<div className="flex gap-2"><span className="font-semibold text-destructive">{t("RequestCancel")}</span></div>)}
                    <p className="font-bold text-foreground pt-1">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">{order.dateTime}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="w-24 h-20 rounded-lg bg-muted overflow-hidden">
                      {order.customerPhoto ? (<img src={order.customerPhoto} alt={order.customerName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />) : (
                        <div className="w-full h-full bg-gradient-to-br from-accent/30 to-muted flex items-center justify-center"><User className="text-muted-foreground" size={24} /></div>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="rounded-md text-xs w-24" disabled={deletingKey === order.groupKey}
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(order); }}>
                      {deletingKey === order.groupKey ? <Loader2 className="animate-spin" size={14} /> : t("Delete")}
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-md text-xs w-24" onClick={(e) => { e.stopPropagation(); navigate(`/customer-profile-readonly?userid=${encodeURIComponent(order.clientId)}`); }}>
                      {t("UserProfile")}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-card rounded-xl p-6 max-w-sm w-full shadow-lg" onClick={(e) => e.stopPropagation()}>
            <p className="text-foreground font-semibold mb-2">{t("Areyousureyouwanttodelete")}</p>
            <p className="text-sm text-muted-foreground mb-4">{deleteConfirm.customerName} — {deleteConfirm.dateTime}</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>{t("Cancel")}</Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDeleteOrder(deleteConfirm)}>{t("Delete")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyOrders;
