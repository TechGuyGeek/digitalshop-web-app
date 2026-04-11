import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Share2, Clock, Activity, Store, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef, useCallback } from "react";
import { fetchCompanyById, CompanyDetails } from "@/lib/api";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { QRCodeCanvas } from "qrcode.react";

const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

function buildAddress(company: CompanyDetails): string {
  return [company.LineOneAddress, company.LineTwoAddress, company.LineThreeAddress, company.LineFourAddress, company.LineCountryAddress].filter((line) => line && line.trim() !== "").join(", ");
}

function formatOpeningHours(opening?: string, closing?: string): string | null {
  if (!opening || !closing) return null;
  const placeholders = ["opening times", "closing times", "00:00:00"];
  if (placeholders.includes(opening.toLowerCase()) || placeholders.includes(closing.toLowerCase())) return null;
  const fmt = (t: string) => { const parts = t.split(":"); return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t; };
  return `${fmt(opening)} to ${fmt(closing)}`;
}

function daysSinceActivity(lastLoggedOn?: string): number | null {
  if (!lastLoggedOn) return null;
  try { const d = new Date(lastLoggedOn); if (isNaN(d.getTime())) return null; return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))); } catch { return null; }
}

function isShopOpen(opening?: string, closing?: string): boolean | null {
  if (!opening || !closing) return null;
  if (["opening times", "closing times"].includes(opening.toLowerCase()) || ["opening times", "closing times"].includes(closing.toLowerCase())) return null;
  const now = new Date(); const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (t: string) => { const parts = t.split(":").map(Number); return (parts[0] || 0) * 60 + (parts[1] || 0); };
  const openMin = toMinutes(opening); const closeMin = toMinutes(closing);
  if (closeMin > openMin) return currentMinutes >= openMin && currentMinutes <= closeMin;
  return currentMinutes >= openMin || currentMinutes <= closeMin;
}

const ShopProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const companyIdParam = searchParams.get("companyid");
  const fallbackName = searchParams.get("name") || "Shop";
  const fallbackIcon = searchParams.get("icon") || "🏪";
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [imgError, setImgError] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = companyIdParam ? parseInt(companyIdParam, 10) : NaN;
    if (isNaN(id) || id <= 0) { setLoading(false); setNotFound(true); return; }
    fetchCompanyById(id).then((data) => { if (data) setCompany(data); else setNotFound(true); setLoading(false); });
  }, [companyIdParam]);

  const shopName = company?.companyname || fallbackName;
  const hours = company ? formatOpeningHours(company.OpeningTimes, company.ClosingTimes) : null;
  const activityDays = company ? daysSinceActivity(company.LastLoggedOn) : null;
  const address = company ? buildAddress(company) : "";
  const imageUrl = company?.companyphoto ? SERVER_DOMAIN + "menu1" + encodeURI(company.companyphoto) : "";

  const handleEnterShop = () => {
    if (!company) return;
    const openStatus = isShopOpen(company.OpeningTimes, company.ClosingTimes);
    if (openStatus === false) { toast.error(`${shopName} ${t("isnowClosed")}. ${hours || ""}`); return; }
    navigate(`/shop-interior?companyid=${company.companyid}&name=${encodeURIComponent(shopName)}`);
  };

  const handleShare = useCallback(async () => {
    const shopUrl = `${window.location.origin}/shop-profile?companyid=${companyIdParam}&name=${encodeURIComponent(shopName)}&icon=${encodeURIComponent(fallbackIcon)}`;
    const shareText = `${shopName}\n${company?.CompanyDescription || ""}\n${shopUrl}`;

    // Download QR code
    const canvas = qrRef.current?.querySelector("canvas");
    if (canvas) {
      try {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob) {
          const link = document.createElement("a");
          link.download = `${shopName.replace(/[^a-zA-Z0-9]/g, "_")}_QRCode.png`;
          link.href = URL.createObjectURL(blob);
          link.click();
          URL.revokeObjectURL(link.href);
        }
      } catch (e) {
        console.log("[Share] QR download failed", e);
      }
    }

    // Open WhatsApp with the share text
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank");
  }, [company, companyIdParam, shopName]);

  const handleBack = () => navigate("/view-shops");

  if (loading) return (<div className="min-h-screen bg-muted flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>);

  if (notFound) return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={handleBack}><ArrowLeft size={20} /></Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">{t("Therewasanerror")}</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <AlertTriangle className="text-destructive" size={48} />
        <p className="text-muted-foreground text-center">{t("Therewasanerror")}</p>
        <Button variant="outline" onClick={handleBack}>{t("Back")}</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={handleBack}><ArrowLeft size={20} /></Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading truncate">{shopName}</h1>
      </div>
      <div className="w-full h-48 bg-card flex items-center justify-center overflow-hidden">
        {imageUrl && !imgError ? (<img src={imageUrl} alt={shopName} className="w-full h-full object-cover" onError={() => setImgError(true)} />) : (<span className="text-5xl">{fallbackIcon}</span>)}
      </div>
      <div ref={qrRef} className="hidden">
        <QRCodeCanvas value={String(companyIdParam || "")} size={300} level="M" includeMargin />
      </div>
      <div className="flex-1 flex flex-col items-center px-6 pt-6 pb-28 text-center">
        {activityDays !== null && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Activity size={14} /><span>{t("ShopActivity")} {activityDays === 0 ? t("Today") : `${activityDays} ${t("Daysago")}`}</span>
          </div>
        )}
        <h2 className="text-2xl font-bold text-foreground font-heading uppercase mb-2">{shopName}</h2>
        {hours && (<div className="flex items-center gap-2 text-foreground font-semibold text-base mb-2"><Clock size={16} /><span>{hours}</span></div>)}
        {address && (<div className="flex items-center gap-2 text-muted-foreground text-sm mb-4"><Store size={14} /><span>{address}</span></div>)}
        {company?.CompanyDescription && (<p className="text-muted-foreground text-sm mt-2">{company.CompanyDescription}</p>)}
        {(company?.CompanyMobile || company?.CompanyEmail) && (
          <div className="mt-4 text-sm text-muted-foreground space-y-1">
            {company.CompanyMobile && <p>📞 {company.CompanyMobile}</p>}
            {company.CompanyEmail && <p>✉️ {company.CompanyEmail}</p>}
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-muted border-t border-border px-6 py-4 flex items-center justify-between max-w-[430px] mx-auto">
        <Button variant="outline" className="rounded-full px-6" onClick={handleEnterShop}>{t("EnterShop")}</Button>
        <Button variant="outline" className="rounded-full px-6 gap-2" onClick={handleShare}><Share2 size={16} />{t("Share")}</Button>
      </div>
    </div>
  );
};

export default ShopProfile;
