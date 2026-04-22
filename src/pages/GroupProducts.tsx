import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVER_DOMAIN } from "@/lib/companyApi";
import ProductCard, { type ProductCardItem } from "@/components/ProductCard";
import { useLanguage } from "@/contexts/LanguageContext";

const OWNER_PRODUCTS_CACHE_PREFIX = "owner-group-products:";

async function fetchGroupProducts(groupId: string): Promise<ProductCardItem[]> {
  const form = new URLSearchParams(); form.append("GroupID", groupId);
  const res = await fetch(SERVER_DOMAIN + "menu1/PHPread/CompanyMenu/PoppulateSubMenu1.php", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
  const data = await res.json(); return Array.isArray(data) ? data : [];
}

function normalizeProduct(product: ProductCardItem): ProductCardItem {
  const menuEnable = product.MenuEnable ?? product.MenuItemEnable ?? "0";
  return { ...product, MenuEnable: menuEnable, MenuItemEnable: menuEnable };
}

function readCachedGroupProducts(groupId: string): ProductCardItem[] {
  if (!groupId) return [];
  try { const raw = window.localStorage.getItem(`${OWNER_PRODUCTS_CACHE_PREFIX}${groupId}`); if (!raw) return []; const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.map(normalizeProduct) : []; } catch { return []; }
}

function writeCachedGroupProducts(groupId: string, products: ProductCardItem[]) {
  if (!groupId) return;
  try { window.localStorage.setItem(`${OWNER_PRODUCTS_CACHE_PREFIX}${groupId}`, JSON.stringify(products.map(normalizeProduct))); } catch {}
}

const GroupProducts = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const groupId = searchParams.get("groupId") || "";
  const groupName = "";
  const groupNameParam = searchParams.get("groupName") || "";
  const companyId = searchParams.get("companyId") || "";
  const [products, setProducts] = useState<ProductCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(false);

  const loadProducts = async () => {
    if (!groupId) { setError(t("Therewasanerror")); setLoading(false); return; }
    setLoading(true); setError(null);
    try { const data = await fetchGroupProducts(groupId); const n = data.map(normalizeProduct); setProducts(n); writeCachedGroupProducts(groupId, n); }
    catch { setError(t("Pleasecheckyourinternetconnection")); } finally { setLoading(false); }
  };

  useEffect(() => { if (fetchRef.current) return; fetchRef.current = true; loadProducts(); }, [groupId]);

  const handleToggleUpdate = (productId: string, newValue: string) => {
    setProducts((prev) => { const next = prev.map((p) => p.ID === productId ? { ...p, MenuEnable: newValue, MenuItemEnable: newValue } : p); writeCachedGroupProducts(groupId, next); return next; });
  };

  const handleDelete = (productId: string) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.ID !== productId);
      writeCachedGroupProducts(groupId, next);
      if (next.length === 0) {
        navigate(`/edit-menu-groups?companyId=${companyId}`);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/edit-menu-groups?companyId=${companyId}`)}><ArrowLeft size={20} /></Button>
        <h1 className="text-lg font-bold text-foreground flex-1 text-center pr-10">{groupName}</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (<div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>)}
        {error && !loading && (
          <div className="flex flex-col items-center gap-4 py-12"><AlertCircle className="text-destructive" size={40} /><p className="text-muted-foreground text-center">{error}</p>
            <Button onClick={loadProducts} variant="outline"><RefreshCw size={16} className="mr-2" />{t("Scan")}</Button>
          </div>
        )}
        {!loading && !error && products.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground text-center text-lg">{t("Noitemsforsale")}</p>
            <Button onClick={() => navigate(`/add-product?groupId=${groupId}&companyId=${companyId}&groupName=${encodeURIComponent(groupName)}`)}><Plus size={16} className="mr-2" />{t("Add")}</Button>
          </div>
        )}
        {!loading && !error && products.map((product) => (
          <ProductCard key={product.ID} product={product} groupId={groupId} companyId={companyId} groupName={groupName} onToggleUpdate={handleToggleUpdate} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
};

export default GroupProducts;
