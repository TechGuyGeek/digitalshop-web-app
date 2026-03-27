import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ShopInterior = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
          onClick={() => navigate(-1)}
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
            onClick={() => {
              /* Navigate to category — will be wired later */
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ShopInterior;
