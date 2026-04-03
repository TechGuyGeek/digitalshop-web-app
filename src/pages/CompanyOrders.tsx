import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { DigitalPerson } from "@/lib/api";
import {
  fetchCompanyOrders,
  groupCompanyOrders,
  filterOrdersByTab,
  getCompanyOrderPhotoUrl,
  type CompanyGroupedOrder,
} from "@/lib/companyOrders";

type TabKey = "today" | "week" | "month";

const TABS: { key: TabKey; label: string }[] = [
  { key: "today", label: "TODAY" },
  { key: "week", label: "WEEK" },
  { key: "month", label: "MONTH" },
];

const CompanyOrders = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<CompanyGroupedOrder[]>([]);

  const getAuth = (): { personId: string; email: string; password: string; companyId: string } | null => {
    try {
      const stored = localStorage.getItem("digitalUser");
      if (!stored) return null;
      const u = JSON.parse(stored) as DigitalPerson;
      const personId = String(u.PersonID || u.ID || "");
      const email = String(u.Email || u.email || "");
      const password = String(u.Password || u.password || "");
      const companyId = String(u.CompanyID || u.companyID || u.companyid || "");
      if (!personId || !companyId || companyId === "0") return null;
      return { personId, email, password, companyId };
    } catch {
      return null;
    }
  };

  const loadOrders = useCallback(async () => {
    const auth = getAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const raw = await fetchCompanyOrders(auth.personId, auth.email, auth.password, auth.companyId);
      console.log("[CompanyOrders] fetched", raw.length, "raw order rows");
      setAllOrders(groupCompanyOrders(raw));
    } catch (err) {
      console.error("Failed to load company orders:", err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const currentOrders = filterOrdersByTab(allOrders, activeTab);

  const getDeliveryType = (order: CompanyGroupedOrder) => {
    if (order.needDelivery === "1") return "Delivery";
    if (order.needTakeaway === "1") return "Takeaway";
    return "On Site";
  };

  const getPaymentLabel = (order: CompanyGroupedOrder) =>
    order.hasPaid === "1" ? "Paid" : "Not Paid";

  const getDeliveryLabel = (order: CompanyGroupedOrder) =>
    order.hasDelivered === "1" ? "Delivered" : "Not Delivered";

  return (
    <div className="h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() => navigate("/company-profile")}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">
          Company Orders
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${
              activeTab === tab.key
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order List label */}
      <div className="bg-card px-4 py-2 shrink-0">
        <p className="text-center text-sm font-semibold text-foreground">
          Order List
        </p>
      </div>

      {/* Orders */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-sm">Loading orders…</p>
          </div>
        ) : currentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <span className="text-4xl mb-4">📦</span>
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          currentOrders.map((order) => {
            const photoUrl = getCompanyOrderPhotoUrl(order.companyphoto);

            return (
              <div
                key={order.randomCode}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  {/* Order details */}
                  <div className="flex-1 space-y-1 text-sm">
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">Total Items</span>
                      <span className="text-foreground">{order.totalItems}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">Total Price</span>
                      <span className="text-foreground">{order.totalPrice}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">Table Number</span>
                      <span className="text-foreground">
                        {order.tableNumber || "—"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">Delivery Type</span>
                      <span className="text-foreground">
                        {getDeliveryType(order)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">Payment Status</span>
                      <span className="text-foreground">
                        {getPaymentLabel(order)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">Delivery Status</span>
                      <span className="text-foreground">
                        {getDeliveryLabel(order)}
                      </span>
                    </div>
                    {order.requestCancel === "1" && (
                      <div className="flex gap-2">
                        <span className="font-semibold text-destructive">Cancel Requested</span>
                      </div>
                    )}
                    <p className="font-bold text-foreground pt-1">
                      {order.companyName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.dateTime}
                    </p>
                  </div>

                  {/* Shop image */}
                  <div className="w-24 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={order.companyName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/30 to-muted flex items-center justify-center">
                        <Store className="text-muted-foreground" size={24} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full text-sm"
                    disabled={order.requestCancel === "1"}
                  >
                    {order.requestCancel === "1" ? "Cancel Pending" : "Request Cancel"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full text-sm"
                    onClick={() => {
                      if (order.companyId) {
                        navigate(`/shop-profile?companyid=${encodeURIComponent(order.companyId)}&from=company-orders`);
                      }
                    }}
                  >
                    Company Profile
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

export default CompanyOrders;
