import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVER_DOMAIN } from "@/lib/companyApi";
import ProductCard, { type ProductCardItem } from "@/components/ProductCard";

async function fetchGroupProducts(groupId: string): Promise<ProductCardItem[]> {
  const form = new URLSearchParams();
  form.append("GroupID", groupId);
  const res = await fetch(SERVER_DOMAIN + "menu1/PHPread/CompanyMenu/PoppulateSubMenuDetail.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

const GroupProducts = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("groupId") || "";
  const groupName = searchParams.get("groupName") || "Products";
  const companyId = searchParams.get("companyId") || "";

  const [products, setProducts] = useState<ProductCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(false);

  const loadProducts = async () => {
    if (!groupId) {
      setError("No group ID provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGroupProducts(groupId);
      setProducts(data);
    } catch {
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    loadProducts();
  }, [groupId]);

  const handleToggleUpdate = (productId: string, newValue: string) => {
    setProducts(prev =>
      prev.map(p => p.ID === productId ? { ...p, MenuItemEnable: newValue } : p)
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/edit-menu-groups?companyId=${companyId}`)}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-foreground flex-1 text-center pr-10">
          {groupName}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="text-destructive" size={40} />
            <p className="text-muted-foreground text-center">{error}</p>
            <Button onClick={loadProducts} variant="outline">
              <RefreshCw size={16} className="mr-2" /> Retry
            </Button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground text-center text-lg">
              No products in this group yet
            </p>
            <Button onClick={() => navigate(`/add-product?groupId=${groupId}&companyId=${companyId}&groupName=${encodeURIComponent(groupName)}`)}>
              <Plus size={16} className="mr-2" /> Add first product
            </Button>
          </div>
        )}

        {!loading && !error && products.map(product => (
          <ProductCard
            key={product.ID}
            product={product}
            groupId={groupId}
            companyId={companyId}
            groupName={groupName}
            onToggleUpdate={handleToggleUpdate}
          />
        ))}
      </div>
    </div>
  );
};

export default GroupProducts;
