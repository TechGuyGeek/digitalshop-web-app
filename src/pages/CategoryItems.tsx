import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShoppingBasket, Loader2, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBasket } from "@/contexts/BasketContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import ProfileHelpAssistant from "@/components/ProfileHelpAssistant";
import ProductMedia from "@/components/ProductMedia";
import { fetchPublicMenuItems, getPublicProductImageUrl, type PublicProduct } from "@/lib/publicShopsApi";

const CategoryItems = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const companyId = searchParams.get("companyid") || "";
  const shopName = searchParams.get("shop") || "Shop";
  const groupId = searchParams.get("groupId") || "";
  const category = searchParams.get("category") || "Items";
  const { count, addItem } = useBasket();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) { setError(t("Therewasanerror")); setLoading(false); return; }
    const fetchProducts = async () => {
      setLoading(true); setError(null);
      try {
        const parsed = await fetchPublicMenuItems(Number(companyId), Number(groupId));
        setProducts(parsed.filter((product) => product.MenuEnable === "1" || product.MenuEnable?.toLowerCase() === "true"));
      } catch { setError(t("Pleasecheckyourinternetconnection")); } finally { setLoading(false); }
    };
    fetchProducts();
  }, [companyId, groupId, t]);

  const handleAddToBasket = (product: PublicProduct) => {
    const price = parseFloat(product.OrderPrice || "0");
    const added = addItem({ id: parseInt(product.ID) || 0, name: product.OrderName, price, description: product.OrderDesription || "", image: getPublicProductImageUrl(product.imagepath, product.ID), groupId, companyId });
    toast[added ? "success" : "error"](added ? t("ItemAddedtoBasket") : "Please complete your current shop basket first.");
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate(`/shop-interior?name=${encodeURIComponent(shopName)}&companyid=${encodeURIComponent(companyId)}`)}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">{category}</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24">
        <ProfileHelpAssistant translationKey="HELPFRONTDOORPRODUCTS" />
        {loading && (<div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-primary" size={32} /></div>)}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertCircle className="text-destructive" size={40} /><p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => navigate(-1)}>{t("Back")}</Button>
          </div>
        )}
        {!loading && !error && products.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="text-4xl">🍽️</span><p className="text-lg font-semibold text-foreground">{t("Noitemsforsale")}</p>
            <Button variant="outline" onClick={() => navigate(-1)}>{t("Back")}</Button>
          </div>
        )}
        {!loading && !error && products.map((product) => {
          const price = parseFloat(product.OrderPrice || "0");
          const mediaCount = (product.images?.length || (product.imagepath ? 1 : 0)) + (product.youtube_video_id ? 1 : 0);
          return (
            <div key={product.ID} className="rounded-xl overflow-hidden bg-card shadow-md hover:shadow-lg transition-shadow">
              <div className="relative w-full aspect-video bg-muted">
                <ProductMedia
                  images={product.images?.length ? product.images : (product.imagepath ? [product.imagepath] : [])}
                  youtubeVideoId={product.youtube_video_id}
                  alt={product.OrderName}
                />
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 flex items-end justify-between">
                  <span className="text-white font-bold text-sm uppercase tracking-wide">{product.OrderName}</span>
                  {price > 0 && <span className="text-white font-bold text-sm">£{price.toFixed(2)}</span>}
                </div>
              </div>
              {product.OrderDesription && (<div className="px-4 pt-3"><p className="text-muted-foreground text-sm">{product.OrderDesription}</p></div>)}
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-xs text-muted-foreground">{mediaCount > 1 ? `${mediaCount} media items` : ""}</span>
                <Button variant="default" className="rounded-full" onClick={() => handleAddToBasket(product)}>
                  <Plus size={16} className="mr-2" />{t("Add") || "Add to basket"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-4 flex items-center justify-center">
        <Button variant="default" className="rounded-full px-8 gap-2" onClick={() => navigate(`/basket?shop=${encodeURIComponent(shopName)}&companyid=${encodeURIComponent(companyId)}`)}>
          <ShoppingBasket size={18} />{t("Basket")} {count}
        </Button>
      </div>
    </div>
  );
};

export default CategoryItems;
