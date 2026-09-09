import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, MapPin, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleMap from "@/components/GoogleMap";
import { useAuth } from "@/contexts/AuthContext";
import { AuthApiError } from "@/lib/authClient";
import { fetchAdminShops } from "@/lib/adminShopsApi";
import { formatDistanceMiles } from "@/lib/geo";
import { getMarkerIconUrl, DEFAULT_MARKER_ICON } from "@/lib/mapMarkerIcons";
import type { NearbyShop } from "@/lib/nearbyShops";

const AdminShops = () => {
  const navigate = useNavigate();
  const { status } = useAuth();
  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restricted, setRestricted] = useState(false);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  const loadShops = useCallback(async (position: { lat: number; lng: number } | null) => {
    setLoading(true);
    setError(null);
    setRestricted(false);
    try {
      setShops(await fetchAdminShops(position));
    } catch (requestError) {
      setShops([]);
      if (requestError instanceof AuthApiError && (requestError.status === 401 || requestError.status === 403)) {
        setRestricted(true);
        setError(requestError.status === 403 ? "Administrator access is required." : "Sign in is required.");
      } else setError(requestError instanceof Error ? requestError.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setShops([]);
      setRestricted(true);
      setError("Sign in is required.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = (position: { lat: number; lng: number } | null) => {
      if (!cancelled) void loadShops(position);
    };
    if (!navigator.geolocation) load(null);
    else navigator.geolocation.getCurrentPosition(
      (value) => {
        const position = { lat: value.coords.latitude, lng: value.coords.longitude };
        if (!cancelled) setUserPosition(position);
        load(position);
      },
      () => load(null),
      { enableHighAccuracy: true, timeout: 10000 },
    );
    return () => { cancelled = true; };
  }, [loadShops, status]);

  const mapShops = shops.map((s) => ({ name: s.name, icon: s.icon, lat: s.lat, lng: s.lng, companyid: s.companyid }));
  const handleShopMapClick = (shop: { name: string; icon: string; companyid?: number }) => {
    if (shop.companyid)
      navigate(
        `/shop-profile?companyid=${shop.companyid}&name=${encodeURIComponent(shop.name)}&icon=${encodeURIComponent(shop.icon)}`,
      );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">Admin Shops</h1>
      </div>

      <div className="p-4 border-b border-border bg-card flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Read-only administrator shop view</p>
        <Button onClick={() => void loadShops(userPosition)} disabled={loading || status !== "authenticated"} aria-label="Refresh admin shops">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {error && <div role={restricted ? "alert" : undefined} className="px-4 py-2 text-sm text-destructive">{error}</div>}

      {loading && !restricted && (
        <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">
          <RefreshCw size={20} className="animate-spin mr-2" /> Loading administrator shops
        </div>
      )}

      {!restricted && !loading && (
        <>
          <div
            className={
              mapExpanded
                ? "fixed inset-0 z-50 bg-background"
                : "relative h-56 w-full"
            }
          >
            <GoogleMap
              className="h-full w-full"
              shops={mapShops}
              onShopClick={handleShopMapClick}
              defaultZoom={3}
            />
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 z-[1000] shadow-md"
              onClick={() => setMapExpanded((v) => !v)}
              aria-label={mapExpanded ? "Collapse map" : "Expand map"}
            >
              {mapExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>
          </div>
          <div className="px-4 py-2 text-xs text-muted-foreground">Total Shops: {shops.length}</div>
          <div className="divide-y divide-border">
            {shops.length === 0 && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <MapPin size={32} className="mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No shops returned</p>
                </div>
              </div>
            )}
            {shops.map((shop) => (
              <button
                key={shop.companyid}
                className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-accent/50 transition-colors"
                onClick={() =>
                  navigate(
                    `/shop-profile?companyid=${shop.companyid}&name=${encodeURIComponent(shop.name)}&icon=${encodeURIComponent(shop.icon)}`,
                  )
                }
              >
                <img
                  src={getMarkerIconUrl({ categoryCode: shop.categoryCode, emoji: shop.icon })}
                  alt=""
                  className="w-8 h-8 object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_MARKER_ICON; }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground block truncate">{shop.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {shop.categoryLabel} · ID {shop.companyid}{formatDistanceMiles(shop.distance) ? ` · ${formatDistanceMiles(shop.distance)}` : ""}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminShops;
