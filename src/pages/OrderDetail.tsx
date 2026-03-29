import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

interface OrderLineItem {
  companyid?: string;
  clientid?: string;
  DateandTime?: string;
  productid?: string;
  OrderName?: string;
  orderName?: string;
  OrderPrice?: string;
  orderPrice?: string;
  imagepath?: string;
  OrderDesription?: string;
  [key: string]: unknown;
}

function getProductPhotoUrl(photo: string | undefined): string {
  if (!photo) return "";
  if (photo.startsWith("http")) return photo;
  const cleaned = photo.startsWith("/") ? photo.slice(1) : photo;
  return `${SERVER_DOMAIN}menu1/${cleaned}`;
}

const OrderDetail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<OrderLineItem[]>([]);

  const companyId = searchParams.get("companyid") || "";
  const clientId = searchParams.get("clientid") || "";
  const dateTime = searchParams.get("datetime") || "";
  const companyName = searchParams.get("companyname") || "Order Details";

  useEffect(() => {
    const loadDetails = async () => {
      if (!companyId || !clientId || !dateTime) {
        setLoading(false);
        return;
      }

      try {
        const formData = new URLSearchParams();
        formData.append("companyID", companyId);
        formData.append("OrderResult", clientId);
        formData.append("getDateandTime", dateTime);

        const response = await fetch(
          SERVER_DOMAIN + "menu1/PHPread/CompanyLiveUserOrders/RetriveLiveUserOrderDetails.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
          }
        );

        const text = await response.text();
        if (!text || text.trim() === "" || text.trim() === "[]") {
          setItems([]);
        } else {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to load order details:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [companyId, clientId, dateTime]);

  const totalItems = items.length;
  const totalPrice = items.reduce((sum, item) => {
    const price = parseFloat(String(item.OrderPrice || item.orderPrice || "0"));
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  return (
    <div className="h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() => navigate("/orders")}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading truncate">
          {companyName}
        </h1>
      </div>

      {/* Totals summary */}
      <div className="bg-card px-4 py-3 border-b border-border shrink-0 space-y-1">
        <div className="flex justify-between text-sm font-semibold text-foreground">
          <span>Total Items</span>
          <span>{totalItems}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-foreground">
          <span>Total Price</span>
          <span>{totalPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-sm">Loading order details…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <span className="text-4xl mb-4">📋</span>
            <p className="text-sm">No items found for this order</p>
          </div>
        ) : (
          items.map((item, idx) => {
            const name = String(item.OrderName || item.orderName || "Item");
            const price = String(item.OrderPrice || item.orderPrice || "0.00");
            const photo = getProductPhotoUrl(item.imagepath);
            const description = String(item.OrderDesription || "");

            return (
              <div
                key={`${item.productid}-${idx}`}
                className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
              >
                {photo ? (
                  <div className="relative w-full h-40">
                    <img
                      src={photo}
                      alt={name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex justify-between items-end">
                      <span className="text-white font-bold text-sm uppercase">
                        {name}
                      </span>
                      <span className="text-white font-bold text-sm">
                        {price}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Store className="text-muted-foreground" size={18} />
                      <span className="font-bold text-sm text-foreground uppercase">
                        {name}
                      </span>
                    </div>
                    <span className="font-bold text-sm text-foreground">
                      {price}
                    </span>
                  </div>
                )}
                {description && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrderDetail;
