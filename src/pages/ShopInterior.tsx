import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShoppingBasket, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBasket } from "@/contexts/BasketContext";
import { useEffect, useState } from "react";

const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

interface MenuGroup {
  ID: string;
  OrderGroup: string;
  companyid?: string;
  MenuEnable?: string;
}

const ShopInterior = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { count, clearBasket } = useBasket();

  const shopName = searchParams.get("name") || "Shop";
  const companyId = searchParams.get("companyid") || "";

  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setError("No company ID provided.");
      setLoading(false);
      return;
    }

    const fetchGroups = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = SERVER_DOMAIN + "menu1/PHPread/CompanyMenu/SelectmenuGroup.php";
        const formData = new URLSearchParams();
        formData.append("companyID", companyId);

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });

        const text = await response.text();

        if (!text || text.toLowerCase().includes("no items for sale")) {
          setGroups([]);
          setLoading(false);
          return;
        }

        const parsed = JSON.parse(text);
        const list: MenuGroup[] = Array.isArray(parsed) ? parsed : [];
        setGroups(list);
      } catch (err) {
        console.error("Failed to load menu groups:", err);
        setError("Could not load menu. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [companyId]);

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
            navigate(`/shop-profile?companyid=${encodeURIComponent(companyId)}`);
          }}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">
          {shopName}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertCircle className="text-destructive" size={40} />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </div>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-lg font-semibold text-foreground">No items for sale</p>
            <p className="text-muted-foreground text-sm">This shop has no menu groups yet.</p>
            <Button variant="outline" onClick={() => navigate(`/shop-profile?companyid=${encodeURIComponent(companyId)}`)}>
              Go Back
            </Button>
          </div>
        )}

        {!loading && !error && groups.length > 0 &&
          groups.map((group) => (
            <button
              key={group.ID}
              className="w-full py-5 text-center text-foreground font-bold text-lg uppercase tracking-wide border-b border-border bg-card hover:bg-accent/50 transition-colors"
              onClick={() =>
                navigate(
                  `/category-items?companyid=${encodeURIComponent(companyId)}&shop=${encodeURIComponent(shopName)}&groupId=${group.ID}&category=${encodeURIComponent(group.OrderGroup)}`
                )
              }
            >
              {group.OrderGroup}
            </button>
          ))
        }
      </div>

      {/* Basket bar */}
      {count > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-4 flex items-center justify-center">
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
