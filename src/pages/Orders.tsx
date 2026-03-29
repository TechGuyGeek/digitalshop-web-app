import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  fetchOrdersToday,
  fetchOrdersWeek,
  fetchOrdersMonth,
  requestCancelOrder,
  groupOrdersByDate,
  type OrderSummary,
} from "@/lib/orderHistory";

const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

type TabKey = "today" | "week" | "month";

const TABS: { key: TabKey; label: string }[] = [
  { key: "today", label: "TODAY" },
  { key: "week", label: "WEEK" },
  { key: "month", label: "MONTH" },
];

const Orders = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [todayOrders, setTodayOrders] = useState<OrderSummary[]>([]);
  const [weekOrders, setWeekOrders] = useState<OrderSummary[]>([]);
  const [monthOrders, setMonthOrders] = useState<OrderSummary[]>([]);

  // Get PersonID from localStorage
  const getPersonId = (): string => {
    try {
      const stored = localStorage.getItem("digitalUser");
      if (stored) {
        const user = JSON.parse(stored);
        return String(user.PersonID || user.ID || "");
      }
    } catch {}
    return "";
  };

  const loadOrders = useCallback(async () => {
    const personId = getPersonId();
    if (!personId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [today, week, month] = await Promise.all([
        fetchOrdersToday(personId),
        fetchOrdersWeek(personId),
        fetchOrdersMonth(personId),
      ]);

      setTodayOrders(groupOrdersByDate(today));
      setWeekOrders(groupOrdersByDate(week));
      setMonthOrders(groupOrdersByDate(month));
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const currentOrders =
    activeTab === "today"
      ? todayOrders
      : activeTab === "week"
      ? weekOrders
      : monthOrders;

  const handleCancel = async (order: OrderSummary) => {
    const personId = getPersonId();
    if (!personId) return;

    const key = `${order.Orderid}-${order.DateandTime}`;
    setCancellingId(key);

    const success = await requestCancelOrder(order, personId, activeTab);
    if (success) {
      toast.success("Cancel request sent");
      loadOrders();
    } else {
      toast.error("Failed to send cancel request");
    }
    setCancellingId(null);
  };

  const handleCompanyProfile = (order: OrderSummary) => {
    const companyId = order.Companyid || order.companyid || "";
    if (companyId) {
      navigate(
        `/shop-profile?companyid=${encodeURIComponent(companyId)}&from=orders`
      );
    }
  };

  const getDeliveryType = (order: OrderSummary) => {
    if (order.NeedDelivery === "1") return "Delivery";
    if (order.NeedTakeaway === "1") return "Takeaway";
    return "On Site";
  };

  const getCompanyPhotoUrl = (photo: string | undefined) => {
    if (!photo) return "";
    if (photo.startsWith("http")) return photo;
    return `${SERVER_DOMAIN}menu1/Images/company/${encodeURIComponent(photo)}`;
  };

  return (
    <div className="h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">
          Orders
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
          currentOrders.map((order, idx) => {
            const cancelKey = `${order.Orderid}-${order.DateandTime}`;
            const isCancelling = cancellingId === cancelKey;
            const photoUrl = getCompanyPhotoUrl(order.companyphoto);

            return (
              <div
                key={`${order.Orderid}-${order.DateandTime}-${idx}`}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  {/* Order details */}
                  <div className="flex-1 space-y-1 text-sm">
                    {order.TotalItems != null && (
                      <div className="flex gap-2">
                        <span className="font-semibold text-foreground">
                          Total Items
                        </span>
                        <span className="text-foreground">
                          {order.TotalItems}
                        </span>
                      </div>
                    )}
                    {order.TotalPrice != null && (
                      <div className="flex gap-2">
                        <span className="font-semibold text-foreground">
                          Total Price
                        </span>
                        <span className="text-foreground">
                          {Number(order.TotalPrice).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">
                        Table Number
                      </span>
                      <span className="text-foreground">
                        {order.TableNumber || "—"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">
                        Delivery Type
                      </span>
                      <span className="text-foreground">
                        {getDeliveryType(order)}
                      </span>
                    </div>
                    {order.PaymentStatus && (
                      <div className="flex gap-2">
                        <span className="font-semibold text-foreground">
                          Payment
                        </span>
                        <span className="text-foreground">
                          {order.PaymentStatus}
                        </span>
                      </div>
                    )}
                    {order.DeliveryStatus && (
                      <div className="flex gap-2">
                        <span className="font-semibold text-foreground">
                          Status
                        </span>
                        <span className="text-foreground">
                          {order.DeliveryStatus}
                        </span>
                      </div>
                    )}
                    <p className="font-bold text-foreground pt-1">
                      {order.CompanyName || order.companyname || "Shop"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.DateandTime}
                    </p>
                  </div>

                  {/* Shop image */}
                  <div className="w-24 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={order.CompanyName || order.companyname || "Shop"}
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
                    disabled={isCancelling}
                    onClick={() => handleCancel(order)}
                  >
                    {isCancelling ? (
                      <Loader2 className="animate-spin mr-1" size={14} />
                    ) : null}
                    Request Cancel
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full text-sm"
                    onClick={() => handleCompanyProfile(order)}
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

export default Orders;
