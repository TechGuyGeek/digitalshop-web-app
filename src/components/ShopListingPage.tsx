import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, List, Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleMap from "@/components/GoogleMap";
import { fetchNearbyShops, fetchGlobalShops, NearbyShop } from "@/lib/nearbyShops";

interface ShopListingPageProps {
  title: string;
  variant?: "free" | "paid" | "global";
}

const tabs = [
  { id: "hybrid", label: "Hybrid View", icon: Layers },
  { id: "map", label: "Map View", icon: MapPin },
  { id: "list", label: "List View", icon: List },
] as const;

type TabId = (typeof tabs)[number]["id"];

const ShopListingPage = ({ title, variant = "free" }: ShopListingPageProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("hybrid");
  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  const loadShops = async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const results = await fetchNearbyShops(lat, lng, variant);
      setShops(results);
    } catch {
      setError("Could not load nearby shops. Tap to retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Location is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(coords);
        loadShops(coords.lat, coords.lng);
      },
      () => {
        setError("Please enable location access to see nearby shops.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const mapShops = shops.map((s) => ({
    name: s.name,
    icon: s.icon,
    lat: s.lat,
    lng: s.lng,
    companyid: s.companyid,
  }));

  const handleShopMapClick = (shop: { name: string; icon: string; companyid?: number }) => {
    if (shop.companyid) {
      navigate(`/shop-profile?companyid=${shop.companyid}&name=${encodeURIComponent(shop.name)}&icon=${encodeURIComponent(shop.icon)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() => navigate("/view-shops")}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">
          {title}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 flex flex-col">
        {activeTab === "hybrid" && (
          <>
            <GoogleMap className="h-56 w-full" shops={mapShops} onShopClick={handleShopMapClick} />
            <ShopContent shops={shops} loading={loading} error={error} onRetry={() => userPos && loadShops(userPos.lat, userPos.lng)} />
          </>
        )}

        {activeTab === "map" && (
          <>
            <GoogleMap className="flex-1 min-h-[400px] w-full" shops={mapShops} onShopClick={handleShopMapClick} />
            {loading && (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading shops…</div>
            )}
          </>
        )}

        {activeTab === "list" && (
          <ShopContent shops={shops} loading={loading} error={error} onRetry={() => userPos && loadShops(userPos.lat, userPos.lng)} />
        )}
      </div>
    </div>
  );
};

const ShopContent = ({
  shops,
  loading,
  error,
  onRetry,
}: {
  shops: NearbyShop[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
          <p className="text-sm">Finding nearby shops…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <MapPin size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw size={14} className="mr-1.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <span className="text-4xl mb-3 block">🏪</span>
          <p className="text-sm font-medium text-foreground mb-1">No shops nearby</p>
          <p className="text-xs text-muted-foreground">No shops found within 0.5 miles of your location</p>
        </div>
      </div>
    );
  }

  return <ShopList shops={shops} />;
};

const ShopList = ({ shops }: { shops: NearbyShop[] }) => {
  const navigate = useNavigate();
  return (
    <div className="divide-y divide-border">
      {shops.map((shop) => (
        <button
          key={shop.companyid}
          className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-accent/50 transition-colors"
          onClick={() =>
            navigate(`/shop-profile?companyid=${shop.companyid}&name=${encodeURIComponent(shop.name)}&icon=${encodeURIComponent(shop.icon)}`)
          }
        >
          <span className="text-2xl">{shop.icon}</span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground block truncate">{shop.name}</span>
            <span className="text-xs text-muted-foreground">{shop.categoryLabel} · {shop.distance.toFixed(2)} mi</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default ShopListingPage;
