import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBasket } from "@/contexts/BasketContext";

const ShopInterior = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { count, clearBasket } = useBasket();

  const shopName = searchParams.get("name") || "Shop";

  // Placeholder categories — will be replaced with PHP API data later
  const categories = [
    { name: "FOOD" },
    { name: "DRINKS" },
    { name: "AFTERS" },
  ];

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() => {
            clearBasket();
            navigate(`/shop-profile?name=${encodeURIComponent(shopName)}`);
          }}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">
          {shopName}
        </h1>
      </div>

      {/* Category list */}
      <div className="flex-1 flex flex-col">
        {categories.map((cat) => (
          <button
            key={cat.name}
            className="w-full py-5 text-center text-foreground font-bold text-lg uppercase tracking-wide border-b border-border bg-card hover:bg-accent/50 transition-colors"
            onClick={() =>
              navigate(
                `/category-items?shop=${encodeURIComponent(shopName)}&category=${encodeURIComponent(cat.name)}`
              )
            }
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Basket bar */}
      {count > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-4 flex items-center justify-center">
          <Button
            variant="default"
            className="rounded-full px-8 gap-2"
            onClick={() => navigate(`/basket?shop=${encodeURIComponent(shopName)}`)}
          >
            <ShoppingBasket size={18} />
            Basket {count}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ShopInterior;
