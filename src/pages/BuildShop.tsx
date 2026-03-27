import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Store, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const GOOGLE_MAPS_KEY = "AIzaSyAN76Tb-dL_5pvp-w1iFhxWqI52sDnoz5c";

const BuildShop = () => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const [shopName, setShopName] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 53.3498, lng: -6.2603 });
  const [locating, setLocating] = useState(true);
  const [saving, setSaving] = useState(false);

  // Get user GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocating(false);
        },
        () => {
          toast.error("Could not get your location, using default");
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocating(false);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (locating || !mapRef.current) return;

    const initMap = () => {
      if (!(window as any).google?.maps) {
        setTimeout(initMap, 200);
        return;
      }

      const map = new google.maps.Map(mapRef.current!, {
        center: coords,
        zoom: 16,
        disableDefaultUI: true,
        zoomControl: true,
      });

      const marker = new google.maps.Marker({
        position: coords,
        map,
        draggable: true,
        title: "Your shop location",
      });

      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (pos) {
          setCoords({ lat: pos.lat(), lng: pos.lng() });
        }
      });

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          marker.setPosition(e.latLng);
          setCoords({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    };

    if ((window as any).google?.maps) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=Function.prototype`;
      script.async = true;
      script.onload = () => initMap();
      document.head.appendChild(script);
    }
  }, [locating, coords]);

  const handleSave = async () => {
    if (!shopName.trim()) {
      toast.error("Please enter a shop name");
      return;
    }
    setSaving(true);

    // TODO: POST to PHP backend to register shop
    // const user = JSON.parse(localStorage.getItem("digitalUser") || "{}");
    // await fetch(SERVER_DOMAIN + "...", { method: "POST", body: ... });

    toast.success("Shop registered successfully!");
    setSaving(false);
    navigate("/profile");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate("/profile")} className="text-foreground">
          <ArrowLeft size={24} />
        </button>
        <Store size={24} className="text-primary" />
        <h1 className="text-lg font-bold text-foreground font-heading">Build Your Shop</h1>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-[300px]">
        {locating ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <MapPin size={32} className="text-primary mx-auto mb-2 animate-bounce" />
              <p className="text-sm text-muted-foreground">Finding your location...</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full absolute inset-0" />
        )}
      </div>

      {/* Coordinates display */}
      <div className="px-4 py-2 bg-muted/50 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          📍 {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          <span className="ml-2 text-muted-foreground/60">— Tap map or drag pin to adjust</span>
        </p>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4 border-t border-border">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-heading mb-1 block">
            Shop Name
          </label>
          <Input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="Enter your shop name"
            className="border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
          />
        </div>

        <Button
          className="w-full rounded-full font-semibold"
          onClick={handleSave}
          disabled={saving || !shopName.trim()}
        >
          <Save size={16} className="mr-2" />
          {saving ? "Saving..." : "Register Shop"}
        </Button>
      </div>
    </div>
  );
};

export default BuildShop;
