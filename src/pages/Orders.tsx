import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type TabKey = "today" | "week" | "month";

const TABS: { key: TabKey; label: string }[] = [
  { key: "today", label: "TODAY" },
  { key: "week", label: "WEEK" },
  { key: "month", label: "MONTH" },
];

// Placeholder order for demo — will be replaced with PHP data
const placeholderOrders = [
  {
    id: 1,
    totalItems: 3,
    totalPrice: 13.0,
    tableNumber: "",
    deliveryType: "On Site",
    paymentStatus: "Not Paid",
    deliveryStatus: "Not Delivered",
    shopName: "Demo London",
    date: "2026-03-27 14:20:29",
    image: "",
  },
];

const Orders = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("today");

  // Placeholder: all tabs show same data for now
  const orders = placeholderOrders;

  return (
    <div className="h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() => navigate(-1)}
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
        <p className="text-center text-sm font-semibold text-foreground">Order List</p>
      </div>

      {/* Orders */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <span className="text-4xl mb-4">📦</span>
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
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
                    <span className="text-foreground">{order.totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-foreground">Table Number</span>
                    <span className="text-foreground">{order.tableNumber || "—"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-foreground">Delivery Type</span>
                    <span className="text-foreground">{order.deliveryType}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-foreground">Payment Status</span>
                    <span className="text-foreground">{order.paymentStatus}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-foreground">Delivery Status</span>
                    <span className="text-foreground">{order.deliveryStatus}</span>
                  </div>
                  <p className="font-bold text-foreground pt-1">{order.shopName}</p>
                  <p className="text-xs text-muted-foreground">{order.date}</p>
                </div>

                {/* Shop image placeholder */}
                <div className="w-24 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                  {order.image ? (
                    <img src={order.image} alt={order.shopName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-accent/30 to-muted flex items-center justify-center">
                      <span className="text-2xl">🏪</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-4">
                <Button variant="outline" className="flex-1 rounded-full text-sm">
                  Request Cancel
                </Button>
                <Button variant="outline" className="flex-1 rounded-full text-sm">
                  Company Profile
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Orders;
