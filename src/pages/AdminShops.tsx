import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, MapPin, Lock, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GoogleMap from "@/components/GoogleMap";
import { getCategoryByCode } from "@/lib/shopCategories";
import type { NearbyShop, NearbyCompany } from "@/lib/nearbyShops";

const ENDPOINT = "https://app.techguygeek.co.uk/menu1/PHPread/ClientMenu/getallshops.php";

const AdminShops = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);

  const handleConnect = async () => {
    if (!password.trim()) {
      setError("Enter password");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body = new URLSearchParams();
      body.append("AdminKey", password);
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const text = await res.text();
      if (!text || text.trim() === "") {
        setError("No data returned (check password)");
        setLoading(false);
        return;
      }
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        setError(`Invalid response: ${text.slice(0, 120)}`);
        setLoading(false);
        return;
      }
      if (!result.success || !Array.isArray(result.data)) {
        setError(result.error || "Unexpected response format");
        setLoading(false);
        return;
      }
      const companies: NearbyCompany[] = result.data;
      const mapped: NearbyShop[] = companies.map((c) => {
        const cat = getCategoryByCode(Number(c.PublicNumber) || 0);
        return {
          companyid: c.companyid,
          name: c.companyname || "Unknown Shop",
          icon: cat.emoji,
          lat: Number(c.companylat),
          lng: Number(c.companylong),
          photo: c.companyphoto || undefined,
          description: c.CompanyDescription || undefined,
          categoryCode: cat.id,
          categoryLabel: cat.label,
          distance: 0,
        };
      });
      setShops(mapped);
      setConnected(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

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

      <div className="p-4 border-b border-border bg-card flex gap-2 items-center">
        <Lock size={16} className="text-muted-foreground" />
        <Input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConnect();
          }}
          className="flex-1"
        />
        <Button onClick={handleConnect} disabled={loading}>
          {loading ? <RefreshCw size={14} className="animate-spin" /> : "Connect"}
        </Button>
      </div>

      {error && <div className="px-4 py-2 text-sm text-destructive">{error}</div>}

      {connected && (
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
          <div className="px-4 py-2 text-xs text-muted-foreground">{shops.length} shops loaded</div>
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
                <span className="text-2xl">{shop.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground block truncate">{shop.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {shop.categoryLabel} · ID {shop.companyid}
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
