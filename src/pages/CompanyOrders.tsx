import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { DigitalPerson } from "@/lib/api";
import {
  fetchCompanyOrdersByTab,
  groupCompanyOrders,
  toggleCompanyOrderFlag,
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
  const location = useLocation();
  const passedCompanyId = (location.state as any)?.companyId || "";

  useEffect(() => {
    if (passedCompanyId) {
      localStorage.setItem("companyOrdersCompanyId", passedCompanyId);
    }
  }, [passedCompanyId]);

  const savedCompanyId = passedCompanyId || localStorage.getItem("companyOrdersCompanyId") || "";
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [orders, setOrders] = useState<CompanyGroupedOrder[]>([]);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const getAuth = () => {
    try {
      const stored = localStorage.getItem("digitalUser");
      if (!stored) return null;
      const u = JSON.parse(stored) as DigitalPerson;
      const personId = String(u.PersonID || u.ID || "");
      const email = String(u.Email || u.email || "");
      const password = String(u.Password || u.password || "");
      const companyId = savedCompanyId || String(u.CompanyID || (u as any).companyID || (u as any).companyid || "");
      if (!personId || !companyId || companyId === "0") return null;
      return { personId, email, password, companyId };
    } catch {
      return null;
    }
  };

  const loadOrders = useCallback(async (tab: TabKey) => {
    const auth = getAuth();
    if (!auth) {
      setLoading(false);
      setError(true);
      toast.error("Could not load user credentials");
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const raw = await fetchCompanyOrdersByTab(auth.personId, auth.email, auth.password, auth.companyId, tab);
      const grouped = groupCompanyOrders(raw);
      setOrders(grouped);
    } catch (err) {
      console.error("Failed to load company orders:", err);
      setError(true);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(activeTab);
  }, [activeTab, loadOrders]);

  const handleToggle = async (
    order: CompanyGroupedOrder,
    flag: "HasPaid" | "HasDelivered",
    newValue: boolean
  ) => {
    const auth = getAuth();
    if (!auth) return;

    const toggleId = `${order.groupKey}-${flag}`;
    setTogglingKey(toggleId);

    // Optimistic update
    const prevOrders = [...orders];
    setOrders((prev) =>
      prev.map((o) =>
        o.groupKey === order.groupKey
          ? { ...o, [flag === "HasPaid" ? "hasPaid" : "hasDelivered"]: newValue ? "1" : "0" }
          : o
      )
    );

    const result = await toggleCompanyOrderFlag(
      activeTab,
      flag,
      newValue ? "1" : "0",
      order,
      auth.personId,
      auth.email,
      auth.password
    );

    if (result === null) {
      setOrders(prevOrders);
      toast.error(`Failed to update ${flag === "HasPaid" ? "payment" : "delivery"} status`);
    } else {
      await loadOrders(activeTab);
      toast.success(`${flag === "HasPaid" ? "Payment" : "Delivery"} status updated`);
    }

    setTogglingKey(null);
  };

  const getDeliveryType = (order: CompanyGroupedOrder) => {
    if (order.needDelivery === "1") return "Delivery";
    if (order.needTakeaway === "1") return "Takeaway";
    return "On Site";
  };

  return (
    <div className="h-screen bg-muted flex flex-col">
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

      <div className="bg-card px-4 py-2 shrink-0">
        <p className="text-center text-sm font-semibold text-foreground">
          Order List
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-sm">Loading orders…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <span className="text-4xl mb-4">⚠️</span>
            <p className="text-sm">Unable to load orders</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <span className="text-4xl mb-4">📦</span>
            <p className="text-sm">No orders</p>
          </div>
        ) : (
          orders.map((order) => {
            const paidToggleId = `${order.groupKey}-HasPaid`;
            const deliveredToggleId = `${order.groupKey}-HasDelivered`;

            return (
              <div
                key={order.groupKey}
                className="rounded-xl border border-border bg-card p-4 shadow-sm cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  const params = new URLSearchParams({
                    companyid: order.companyId,
                    clientid: order.clientId,
                    datetime: order.dateTime,
                    range: activeTab,
                  });
                  navigate(`/company-order-detail?${params.toString()}`);
                }}
              >
                <div className="flex gap-3">
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
                      <span className="text-foreground">{order.tableNumber || "—"}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">Delivery Type</span>
                      <span className="text-foreground">{getDeliveryType(order)}</span>
                    </div>

                    {/* Paid toggle */}
                    <div
                      className="flex items-center gap-2 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Switch
                        checked={order.hasPaid === "1"}
                        disabled={togglingKey === paidToggleId}
                        onCheckedChange={(checked) =>
                          handleToggle(order, "HasPaid", checked)
                        }
                      />
                      <span className="text-foreground">Paid</span>
                    </div>

                    {/* Delivered toggle */}
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Switch
                        checked={order.hasDelivered === "1"}
                        disabled={togglingKey === deliveredToggleId}
                        onCheckedChange={(checked) =>
                          handleToggle(order, "HasDelivered", checked)
                        }
                      />
                      <span className="text-foreground">Delivered</span>
                    </div>

                    {order.requestCancel === "1" && (
                      <div className="flex gap-2">
                        <span className="font-semibold text-destructive">Cancel Requested</span>
                      </div>
                    )}

                    <p className="font-bold text-foreground pt-1">
                      {order.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.dateTime}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="w-24 h-20 rounded-lg bg-muted overflow-hidden">
                      {order.customerPhoto ? (
                        <img
                          src={order.customerPhoto}
                          alt={order.customerName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-accent/30 to-muted flex items-center justify-center">
                          <User className="text-muted-foreground" size={24} />
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md text-xs w-24"
                    >
                      Delete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md text-xs w-24"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/customer-profile-readonly?userid=${encodeURIComponent(order.clientId)}`);
                      }}
                    >
                      User Profile
                    </Button>
                  </div>
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
