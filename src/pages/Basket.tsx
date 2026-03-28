import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBasket } from "@/contexts/BasketContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

const generateRandomCode = (length: number) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

type OrderMode = "onsite" | "takeaway" | "delivery";

const Basket = () => {
  const navigate = useNavigate();
  const [tableNumber, setTableNumber] = useState<string>("");
  const [searchParams] = useSearchParams();
  const shopName = searchParams.get("shop") || "Shop";
  const companyId = searchParams.get("companyid") || "";
  const { items, count, total, removeItem, clearItem, clearBasket } = useBasket();
  const [submitting, setSubmitting] = useState(false);

  const placeOrder = async (mode: OrderMode) => {
    if (submitting) return;
    if (items.length === 0) {
      toast.error("Your basket is empty");
      return;
    }

    setSubmitting(true);
    const randomCode = generateRandomCode(64);
    const needTakeaway = mode === "takeaway" ? "1" : "0";
    const needDelivery = mode === "delivery" ? "1" : "0";

    try {
      const url = SERVER_DOMAIN + "menu1/PHPwrite/LiveOrders/PlaceOrderToCompany2.php";

      for (const item of items) {
        for (let q = 0; q < item.quantity; q++) {
          const formData = new URLSearchParams();
          formData.append("companyID", companyId);
          formData.append("CompanyName", shopName);
          formData.append("CompanyEmail", "");
          formData.append("CompanyMobile", "");
          formData.append("MenuNotifications", "0");
          formData.append("PersonID", "0");
          formData.append("Name", "Guest");
          formData.append("Surname", "");
          formData.append("GroupID", item.groupId || "0");
          formData.append("OrderID", String(item.id));
          formData.append("TableNumber", tableNumber || "0");
          formData.append("NeedTakeaway", needTakeaway);
          formData.append("NeedDelivery", needDelivery);
          formData.append("RandomeCode", randomCode);

          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
          });

          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }
        }
      }

      clearBasket();
      toast.success("Order placed successfully!");
      navigate("/orders");
    } catch (err) {
      console.error("Order submission failed:", err);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen bg-muted flex flex-col max-w-md mx-auto w-full">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() =>
            navigate(
              `/shop-interior?name=${encodeURIComponent(shopName)}&companyid=${encodeURIComponent(companyId)}`
            )
          }
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">
          Basket
        </h1>
      </div>

      {/* Summary bar */}
      <div className="bg-card px-4 py-3 flex flex-col gap-1 border-b border-border">
        <div className="flex justify-between text-foreground font-semibold text-sm">
          <span>Total Items</span>
          <span>{count}</span>
        </div>
        <div className="flex justify-between text-foreground font-semibold text-sm">
          <span>Total Price</span>
          <span>£{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <span className="text-4xl mb-4">🛒</span>
            <p className="text-sm">Your basket is empty</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl overflow-hidden bg-card shadow-md"
            >
              <div className="relative w-full h-40 bg-muted">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent/30 to-muted flex items-center justify-center">
                    <span className="text-4xl">🍽️</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 flex items-end justify-between">
                  <span className="text-white font-bold text-sm uppercase tracking-wide">
                    {item.name}
                  </span>
                  <span className="text-white font-bold text-sm">
                    £{item.price.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="px-4 py-3">
                <p className="text-muted-foreground text-sm">{item.description}</p>
                <p className="text-foreground text-xs mt-1">Qty: {item.quantity}</p>
              </div>

              <div className="px-4 pb-3 flex items-center justify-center gap-3">
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-full px-5 gap-1"
                  onClick={() => removeItem(item.id)}
                  disabled={submitting}
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full px-5 gap-1"
                  onClick={() => clearItem(item.id)}
                  disabled={submitting}
                >
                  <X size={14} />
                  Clear
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table Number */}
      <div className="bg-card border-t border-border px-4 py-3 shrink-0 flex items-center justify-between">
        <p className="text-muted-foreground text-sm font-medium">Table Number</p>
        <Select value={tableNumber} onValueChange={setTableNumber}>
          <SelectTrigger className="w-28 h-9 rounded-full">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {Array.from({ length: 501 }, (_, i) => (
              <SelectItem key={i} value={String(i)}>
                {i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Order type buttons */}
      <div className="bg-card border-t border-border px-4 py-4 flex items-center justify-between gap-3 shrink-0">
        <Button
          variant="outline"
          className="flex-1 rounded-full"
          onClick={() => placeOrder("takeaway")}
          disabled={submitting || items.length === 0}
        >
          {submitting ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
          Take Away
        </Button>
        <Button
          variant="outline"
          className="flex-1 rounded-full"
          onClick={() => placeOrder("onsite")}
          disabled={submitting || items.length === 0}
        >
          {submitting ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
          On Site
        </Button>
        <Button
          variant="outline"
          className="flex-1 rounded-full"
          onClick={() => placeOrder("delivery")}
          disabled={submitting || items.length === 0}
        >
          {submitting ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
          Deliver
        </Button>
      </div>
    </div>
  );
};

export default Basket;
