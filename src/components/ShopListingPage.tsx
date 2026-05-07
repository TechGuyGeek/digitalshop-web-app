import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, List, Layers, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleMap from "@/components/GoogleMap";
import { fetchNearbyShops, fetchGlobalShops, NearbyShop } from "@/lib/nearbyShops";
import { useLanguage } from "@/contexts/LanguageContext";
import AdvertSlot from "@/components/adverts/AdvertSlot";
import { getMarkerIconUrl, DEFAULT_MARKER_ICON } from "@/lib/mapMarkerIcons";

interface ShopListingPageProps { title: string; variant?: "free" | "paid" | "global"; }

const tabs = [
  { id: "hybrid", labelKey: "HybridView", icon: Layers },
  { id: "map", labelKey: "MapView", icon: MapPin },
  { id: "list", labelKey: "ListView", icon: List },
] as const;

type TabId = (typeof tabs)[number]["id"];

const ShopListingPage = ({ title, variant = "free" }: ShopListingPageProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>("hybrid");
  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const isGlobal = variant === "global";

  const loadShops = async (lat?: number, lng?: number) => {
    setLoading(true); setError(null);
    try { const results = isGlobal ? await fetchGlobalShops() : await fetchNearbyShops(lat!, lng!, variant as "free" | "paid"); setShops(results); }
    catch { setError(t("Pleasecheckyourinternetconnection")); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (isGlobal) { loadShops(); if (navigator.geolocation) navigator.geolocation.getCurrentPosition((pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => {}, { enableHighAccuracy: true, timeout: 10000 }); return; }
    if (!navigator.geolocation) { setError(t("LocationDenied")); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition((pos) => { const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }; setUserPos(coords); loadShops(coords.lat, coords.lng); }, () => { setError(t("LocationDenied")); setLoading(false); }, { enableHighAccuracy: true, timeout: 10000 });
  }, []);

  const mapShops = shops.map((s) => ({ name: s.name, icon: s.icon, lat: s.lat, lng: s.lng, companyid: s.companyid }));
  const handleShopMapClick = (shop: { name: string; icon: string; companyid?: number }) => { if (shop.companyid) navigate(`/shop-profile?companyid=${shop.companyid}&name=${encodeURIComponent(shop.name)}&icon=${encodeURIComponent(shop.icon)}`); };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate("/view-shops")}><ArrowLeft size={20} /></Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">{title}</h1>
      </div>
      <div className="flex border-b border-border bg-card">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === tab.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {t(tab.labelKey)}
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        {activeTab === "hybrid" && (<>
          <div className="relative h-56 w-full">
            <GoogleMap className="h-full w-full" shops={mapShops} onShopClick={handleShopMapClick} defaultZoom={isGlobal ? 3 : 14} rangeCircleMetres={variant === "free" ? 804.67 : variant === "paid" ? 1609.34 : undefined} />
          </div>
          {(variant === "free" || variant === "paid") && <p className="text-[11px] text-muted-foreground text-center py-1">{variant === "free" ? (t("Showingshopswithin") !== "Showingshopswithin" ? t("Showingshopswithin") : "Showing shops within 0.5 miles") : "Showing shops within 1 mile"}</p>}
          <ShopContent shops={shops} loading={loading} error={error} isGlobal={isGlobal} onRetry={() => isGlobal ? loadShops() : userPos && loadShops(userPos.lat, userPos.lng)} />
        </>)}
        {activeTab === "map" && (<>
          <ExpandableMap expanded={mapExpanded} onToggle={() => setMapExpanded(v => !v)} baseClassName="relative w-full h-[60vh] min-h-[400px]">
            <GoogleMap className="h-full w-full" shops={mapShops} onShopClick={handleShopMapClick} defaultZoom={isGlobal ? 3 : 14} rangeCircleMetres={variant === "free" ? 804.67 : variant === "paid" ? 1609.34 : undefined} />
          </ExpandableMap>
          {(variant === "free" || variant === "paid") && <p className="text-[11px] text-muted-foreground text-center py-1">{variant === "free" ? (t("Showingshopswithin") !== "Showingshopswithin" ? t("Showingshopswithin") : "Showing shops within 0.5 miles") : "Showing shops within 1 mile"}</p>}
          {loading && (<div className="p-4 text-center text-sm text-muted-foreground">{t("Pleasewait")}</div>)}
        </>)}
        {activeTab === "list" && (<ShopContent shops={shops} loading={loading} error={error} isGlobal={isGlobal} onRetry={() => isGlobal ? loadShops() : userPos && loadShops(userPos.lat, userPos.lng)} />)}
      </div>
      <AdvertSlot position="bottomBanner" className="px-4 pb-3" />
    </div>
  );
};

const ShopContent = ({ shops, loading, error, isGlobal = false, onRetry }: { shops: NearbyShop[]; loading: boolean; error: string | null; isGlobal?: boolean; onRetry: () => void; }) => {
  const { t } = useLanguage();
  if (loading) return (<div className="flex-1 flex items-center justify-center p-8"><div className="text-center text-muted-foreground"><RefreshCw size={24} className="animate-spin mx-auto mb-2" /><p className="text-sm">{t("Pleasewait")}</p></div></div>);
  if (error) return (<div className="flex-1 flex items-center justify-center p-8"><div className="text-center"><MapPin size={32} className="mx-auto mb-3 text-muted-foreground" /><p className="text-sm text-muted-foreground mb-3">{error}</p><Button variant="outline" size="sm" onClick={onRetry}><RefreshCw size={14} className="mr-1.5" />{t("Scan")}</Button></div></div>);
  if (shops.length === 0) return (<div className="flex-1 flex items-center justify-center p-8"><div className="text-center"><span className="text-4xl mb-3 block">🏪</span><p className="text-sm font-medium text-foreground mb-1">{isGlobal ? t("Noshopinyourarea") : t("Noshopinyourarea")}</p></div></div>);
  return <ShopList shops={shops} isGlobal={isGlobal} />;
};

const ExpandableMap = ({ expanded, onToggle, baseClassName, children }: { expanded: boolean; onToggle: () => void; baseClassName: string; children: React.ReactNode }) => (
  <div className={expanded ? "fixed inset-0 z-50 bg-background" : baseClassName}>
    {children}
    <Button
      size="icon"
      variant="secondary"
      className="absolute top-2 right-2 z-[1000] shadow-md"
      onClick={onToggle}
      aria-label={expanded ? "Collapse map" : "Expand map"}
    >
      {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </Button>
  </div>
);

const ShopList = ({ shops, isGlobal = false }: { shops: NearbyShop[]; isGlobal?: boolean }) => {
  const navigate = useNavigate();
  return (
    <div className="divide-y divide-border">
      {shops.map((shop) => (
        <button key={shop.companyid} className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-accent/50 transition-colors" onClick={() => navigate(`/shop-profile?companyid=${shop.companyid}&name=${encodeURIComponent(shop.name)}&icon=${encodeURIComponent(shop.icon)}`)}>
          <img
            src={getMarkerIconUrl({ categoryCode: shop.categoryCode, emoji: shop.icon })}
            alt=""
            className="w-8 h-8 object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_MARKER_ICON; }}
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground block truncate">{shop.name}</span>
            <span className="text-xs text-muted-foreground">{shop.categoryLabel}{!isGlobal && shop.distance > 0 ? ` · ${shop.distance.toFixed(2)} mi` : ""}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default ShopListingPage;
