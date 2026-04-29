import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Store, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILE_URL = "https://maps.techguygeek.co.uk/tiles/osm/webmercator/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = "© OpenStreetMap contributors";

const BuildShop = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [shopName, setShopName] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 53.3498, lng: -6.2603 });
  const [locating, setLocating] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyEmail, setCompanyEmail] = useState("");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
        () => { toast.error(t("LocationDenied")); setLocating(false); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else { setLocating(false); }
  }, []);

  useEffect(() => {
    if (locating || !mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { center: [coords.lat, coords.lng], zoom: 16, zoomControl: true });
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
    const marker = L.marker([coords.lat, coords.lng], { draggable: true, title: t("ClickPintoaddCompany") }).addTo(map);
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setCoords({ lat: pos.lat, lng: pos.lng });
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    mapInstanceRef.current = map;
    markerRef.current = marker;
    setTimeout(() => map.invalidateSize(), 50);
    return () => { map.remove(); mapInstanceRef.current = null; markerRef.current = null; };
  }, [locating]);

  const handleSave = async () => {
    if (!shopName.trim()) { toast.error(t("RegistrationFailedCompanyNamecannotbeempty")); return; }
    if (!companyEmail.trim()) { toast.error(t("RegistrationFailedCompanyEmailscannotbeempty")); return; }
    setSaving(true);
    const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";
    const user = JSON.parse(localStorage.getItem("digitalUser") || "{}");
    const personId = user.PersonID || user.personID || user.ID || "";
    const email = user.Email || user.email || "";
    const password = user.Password || user.password || "";
    const saveUrl = SERVER_DOMAIN + "menu1/PHPwrite/Company/SaveCompanyDetails2Secure.php";
    const savePayload = { PersonID: String(personId), Email: email, Password: password, CompanyName: shopName.trim(), CompanyEmail: companyEmail.trim(), companylat: coords.lat, companylong: coords.lng };
    console.log("[BuildShop] === STEP 1: Calling SaveCompanyDetails2Secure ===");
    console.log("[BuildShop] Save endpoint:", saveUrl);
    console.log("[BuildShop] Save payload:", JSON.stringify(savePayload));
    try {
      let saveRes: Response;
      try { saveRes = await fetch(saveUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(savePayload) }); }
      catch (fetchErr) { console.error("[BuildShop] FETCH FAILED:", fetchErr); toast.error(t("Pleasecheckyourinternetconnection")); setSaving(false); return; }
      const saveText = await saveRes.text();
      console.log("[BuildShop] Save response status:", saveRes.status);
      console.log("[BuildShop] Save raw response:", saveText);
      if (!saveRes.ok) { toast.error(t("SaveFailed")); setSaving(false); return; }
      console.log("[BuildShop] === STEP 2: Checking company exists ===");
      const checkUrl = SERVER_DOMAIN + "menu1/PHPread/Company/DoesCompanyExistorNotSecure.php";
      const checkPayload = { PersonID: String(personId), UserEmail: email };
      const checkRes = await fetch(checkUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(checkPayload) });
      const checkText = await checkRes.text();
      let checkData: any;
      try { checkData = JSON.parse(checkText); } catch { checkData = null; }
      if (checkData?.success && checkData.companies?.length > 0) {
        const company = checkData.companies[0];
        localStorage.setItem("hasShop", "true");
        localStorage.setItem("currentCompany", JSON.stringify(company));
        toast.success(t("RegistrationSuccessful"));
        navigate("/company-profile");
      } else { toast.error(t("RegistrationFailed")); }
    } catch (err) { console.error("[BuildShop] Error:", err); toast.error(t("Pleasecheckyourinternetconnection")); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate("/profile")} className="text-foreground"><ArrowLeft size={24} /></button>
        <Store size={24} className="text-primary" />
        <h1 className="text-lg font-bold text-foreground font-heading">{t("CompanyRegisterPageTitle")}</h1>
      </div>
      <div className="flex-1 relative min-h-[300px]">
        {locating ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <MapPin size={32} className="text-primary mx-auto mb-2 animate-bounce" />
              <p className="text-sm text-muted-foreground">{t("Needlocation")}</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full absolute inset-0" />
        )}
      </div>
      <div className="px-4 py-2 bg-muted/50 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          📍 {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          <span className="ml-2 text-muted-foreground/60">— {t("ClickPintoaddCompany")}</span>
        </p>
      </div>
      <div className="p-4 space-y-4 border-t border-border">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-heading mb-1 block">{t("CompanyName")}</label>
          <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder={t("CompanyName")} className="border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary" />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-heading mb-1 block">{t("CompanyEmail")}</label>
          <Input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder={t("CompanyEmail")} className="border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary" />
        </div>
        <Button className="w-full rounded-full font-semibold" onClick={handleSave} disabled={saving || !shopName.trim() || !companyEmail.trim()}>
          <Save size={16} className="mr-2" />
          {saving ? t("Pleasewait") : t("Register")}
        </Button>
      </div>
    </div>
  );
};

export default BuildShop;
