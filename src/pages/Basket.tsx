import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBasket } from "@/contexts/BasketContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Basket = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shopName = searchParams.get("shop") || "Shop";
  const { items, count, total, removeItem, clearItem } = useBasket();

  return (
    <div className="h-screen bg-muted flex flex-col max-w-md mx-auto w-full">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() => navigate(-1)}
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
          <span>{total.toFixed(2)}</span>
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
              {/* Item image */}
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
                {/* Overlay with name and price */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 flex items-end justify-between">
                  <span className="text-white font-bold text-sm uppercase tracking-wide">
                    {item.name}
                  </span>
                  <span className="text-white font-bold text-sm">
                    {item.price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="px-4 py-3">
                <p className="text-muted-foreground text-sm">
                  {item.description}
                </p>
                <p className="text-foreground text-xs mt-1">
                  Qty: {item.quantity}
                </p>
              </div>

              {/* Actions */}
              <div className="px-4 pb-3 flex items-center justify-center gap-3">
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-full px-5 gap-1"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full px-5 gap-1"
                  onClick={() => clearItem(item.id)}
                >
                  <X size={14} />
                  Clear
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table Number placeholder */}
      <div className="bg-card border-t border-border px-4 py-3">
        <p className="text-muted-foreground text-sm font-medium">Table Number</p>
      </div>

      {/* Order type buttons */}
      <div className="bg-card border-t border-border px-4 py-4 flex items-center justify-between gap-3 shrink-0">
        <Button variant="outline" className="flex-1 rounded-full">
          Take Away
        </Button>
        <Button variant="outline" className="flex-1 rounded-full">
          On Site
        </Button>
        <Button variant="outline" className="flex-1 rounded-full">
          Deliver
        </Button>
      </div>
    </div>
  );
};

export default Basket;
