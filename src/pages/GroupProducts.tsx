import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SERVER_DOMAIN } from "@/lib/companyApi";

interface GroupProduct {
  ID: string;
  OrderName: string;
  OrderPrice?: string;
  OrderDesription?: string;
  imagepath?: string;
  MenuItemEnable?: string;
}

async function fetchGroupProducts(groupId: string): Promise<GroupProduct[]> {
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

function getImageUrl(path?: string) {
  if (!path) return "";
  const cleaned = path.startsWith("/") ? path.slice(1) : path;
  const withPrefix = cleaned.startsWith("menu1/") ? cleaned : "menu1/" + cleaned;
  return SERVER_DOMAIN + withPrefix;
}

const GroupProducts = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("groupId") || "";
  const groupName = searchParams.get("groupName") || "Products";
  const companyId = searchParams.get("companyId") || "";

  const [products, setProducts] = useState<GroupProduct[]>([]);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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
            <Button onClick={() => toast.info("Add product coming soon")}>
              <Plus size={16} className="mr-2" /> Add first product
            </Button>
          </div>
        )}

        {!loading && !error && products.map(product => {
          const imgUrl = getImageUrl(product.imagepath);
          return (
            <div key={product.ID} className="border border-border rounded-lg overflow-hidden bg-card">
              {imgUrl && (
                <div className="relative h-48 w-full">
                  <img
                    src={imgUrl}
                    alt={product.OrderName}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-end justify-between">
                    <span className="text-white font-bold text-base uppercase">{product.OrderName}</span>
                    {product.OrderPrice && (
                      <span className="text-white font-bold text-base">
                        {parseFloat(product.OrderPrice).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {!imgUrl && (
                <div className="p-3 flex items-center justify-between">
                  <span className="font-bold text-foreground text-base uppercase">{product.OrderName}</span>
                  {product.OrderPrice && (
                    <span className="font-bold text-foreground text-base">
                      {parseFloat(product.OrderPrice).toFixed(2)}
                    </span>
                  )}
                </div>
              )}

              <div className="p-3 space-y-3">
                {product.OrderDesription && (
                  <p className="text-sm text-muted-foreground">{product.OrderDesription}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">The Item is Enabled</span>
                  <Switch
                    checked={product.MenuItemEnable === "1"}
                    onCheckedChange={() => toast.info("Toggle coming soon")}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => toast.info("Add coming soon")}>
                    Add
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => toast.info("Edit coming soon")}>
                    Edit
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => toast.info("Delete coming soon")}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupProducts;
