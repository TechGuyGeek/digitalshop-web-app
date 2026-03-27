import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBasket } from "@/contexts/BasketContext";

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
}

const CategoryItems = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shopName = searchParams.get("shop") || "Shop";
  const category = searchParams.get("category") || "Items";

  const { count, addItem } = useBasket();

  // Placeholder products — will be replaced with PHP API data later
  const products: Product[] = [
    {
      id: 1,
      name: "TOAD IN THE WHOLE",
      price: 4.99,
      description: "Toad in the hole 🤩 with beans and mash",
      image: "",
    },
    {
      id: 2,
      name: "CHEESE BURGERS",
      price: 5.0,
      description: "Cheese Burger with Pigs in blankets",
      image: "",
    },
    {
      id: 3,
      name: "MINCE AND RICE",
      price: 6.0,
      description: "Mince and Rice with crisps 🤣",
      image: "",
    },
  ];

  const handleAddToBasket = (product: Product) => {
    addItem(product);
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() =>
            navigate(
              `/shop-interior?name=${encodeURIComponent(shopName)}`
            )
          }
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">
          {category}
        </h1>
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24">
        {products.map((product) => (
          <button
            key={product.id}
            className="w-full text-left rounded-xl overflow-hidden bg-card shadow-md hover:shadow-lg transition-shadow"
            onClick={() => handleAddToBasket(product)}
          >
            {/* Product image */}
            <div className="relative w-full h-44 bg-muted">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
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
                  {product.name}
                </span>
                <span className="text-white font-bold text-sm">
                  {product.price.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="px-4 py-3">
              <p className="text-muted-foreground text-sm">
                {product.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Basket bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-4 flex items-center justify-center">
        <Button variant="default" className="rounded-full px-8 gap-2">
          <ShoppingBasket size={18} />
          Basket {count}
        </Button>
      </div>
    </div>
  );
};

export default CategoryItems;
