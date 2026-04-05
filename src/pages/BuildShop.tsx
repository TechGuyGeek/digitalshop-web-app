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
  const [companyEmail, setCompanyEmail] = useState("");

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
    if (!companyEmail.trim()) {
      toast.error("Please enter a company email");
      return;
    }
    setSaving(true);

    const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";
    const user = JSON.parse(localStorage.getItem("digitalUser") || "{}");
    const personId = user.PersonID || user.personID || user.ID || "";
    const email = user.Email || user.email || "";
    const password = user.Password || user.password || "";

    // Step 1: Save new company
    const saveUrl = SERVER_DOMAIN + "menu1/PHPwrite/Company/SaveCompanyDetails2Secure.php";
    const savePayload = {
      PersonID: String(personId),
      Email: email,
      Password: password,
      CompanyName: shopName.trim(),
      CompanyEmail: companyEmail.trim(),
      companylat: coords.lat,
      companylong: coords.lng,
    };

    console.log("[BuildShop] === STEP 1: Calling SaveCompanyDetails2Secure ===");
    console.log("[BuildShop] Save endpoint:", saveUrl);
    console.log("[BuildShop] Save payload:", JSON.stringify(savePayload));

    try {
      let saveRes: Response;
      try {
        saveRes = await fetch(saveUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(savePayload),
        });
      } catch (fetchErr) {
        console.error("[BuildShop] FETCH FAILED (CORS or network):", fetchErr);
        toast.error("Network/CORS error calling save endpoint. Check console.");
        setSaving(false);
        return;
      }
      const saveText = await saveRes.text();
      console.log("[BuildShop] Save response status:", saveRes.status);
      console.log("[BuildShop] Save raw response:", saveText);

      if (!saveRes.ok) {
        toast.error("Failed to register shop. Server returned " + saveRes.status);
        setSaving(false);
        return;
      }

      console.log("[BuildShop] === STEP 2: Checking company exists ===");

      // Step 2: Check company exists
      const checkUrl = SERVER_DOMAIN + "menu1/PHPread/Company/DoesCompanyExistorNotSecure.php";
      const checkPayload = {
        PersonID: String(personId),
        UserEmail: email,
      };
      console.log("[BuildShop] Check endpoint:", checkUrl);
      console.log("[BuildShop] Check payload:", checkPayload);

      const checkRes = await fetch(checkUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkPayload),
      });
      const checkText = await checkRes.text();
      console.log("[BuildShop] Check raw response:", checkText);

      let checkData: any;
      try { checkData = JSON.parse(checkText); } catch { checkData = null; }

      if (checkData?.success && checkData.companies?.length > 0) {
        const company = checkData.companies[0];
        console.log("[BuildShop] Company found:", company);
        localStorage.setItem("hasShop", "true");
        localStorage.setItem("currentCompany", JSON.stringify(company));
        toast.success("Shop registered successfully!");
        navigate("/company-profile");
      } else {
        toast.error("Shop was saved but could not be found. Please try again.");
      }
    } catch (err) {
      console.error("[BuildShop] Error:", err);
      toast.error("Connection error while registering shop");
    } finally {
      setSaving(false);
    }
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

        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-heading mb-1 block">
            Company Email
          </label>
          <Input
            type="email"
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
            placeholder="Enter company email address"
            className="border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
          />
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
          disabled={saving || !shopName.trim() || !companyEmail.trim()}
        >
          <Save size={16} className="mr-2" />
          {saving ? "Saving..." : "Register Shop"}
        </Button>
      </div>
    </div>
  );
};

export default BuildShop;
