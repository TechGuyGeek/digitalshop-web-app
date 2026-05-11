import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Store, MessageSquare, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const SERVER_DOMAIN = "https://web.gpsshops.com/";

interface CompanyData { CompanyID?: string; CompanyName?: string; companyphoto?: string; LineOneAddress?: string; LineTwoAddress?: string; LineThreeAddress?: string; LineFourAddress?: string; LineCountryAddress?: string; CompanyMobile?: string; CompanyEmail?: string; [key: string]: any; }

async function fetchCompanyProfile(companyId: string): Promise<CompanyData | null> {
  const url = SERVER_DOMAIN + "menu1/PHPread/Company/RetrieveCompanyProfiledetails2.php";
  const body = new URLSearchParams({ CompanyID: companyId });
  const res = await fetch(url, { method: "POST", body }); if (!res.ok) return null;
  const data = await res.json(); const arr = Array.isArray(data) ? data : data?.data ? (Array.isArray(data.data) ? data.data : [data.data]) : [data];
  return arr.length > 0 ? arr[0] : null;
}

function getCompanyImageUrl(photo: string | undefined): string | null {
  const path = String(photo || ""); if (!path) return null; if (path.startsWith("http")) return path;
  const clean = path.startsWith("/") ? path : "/" + path; return SERVER_DOMAIN + "menu1" + clean;
}

const CompanyProfileReadonly = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const companyId = searchParams.get("companyid") || "";
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!companyId) { setLoading(false); setError(true); return; }
    fetchCompanyProfile(companyId).then((c) => { setCompany(c); if (!c) setError(true); }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [companyId]);

  const companyName = company?.CompanyName || company?.companyname || "";
  const imageUrl = company ? getCompanyImageUrl(company.companyphoto) : null;
  const mobile = company?.CompanyMobile || "";
  const email = company?.CompanyEmail || "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const normalizeForWhatsApp = (num: string): string => { let cleaned = num.replace(/[\s\-()]/g, ""); if (cleaned.startsWith("0")) cleaned = "44" + cleaned.slice(1); return cleaned; };

  const handleSms = () => { if (!mobile) return; if (isMobile) window.open(`sms:${mobile}?body=Welcome to Digital shop`, "_blank"); else { navigator.clipboard.writeText(mobile); toast.info(t("Therewasanerror")); } };
  const handlePhone = () => { if (!mobile) return; if (isMobile) window.open(`tel:${mobile}`, "_blank"); else { navigator.clipboard.writeText(mobile); toast.info(t("Therewasanerror")); } };
  const handleWhatsApp = () => { if (!mobile) return; window.open(`https://wa.me/${normalizeForWhatsApp(mobile)}?text=Welcome%20to%20Digital%20shop`, "_blank"); };
  const handleEmail = () => { if (!email) return; window.open(`mailto:${email}`, "_blank"); };

  return (
    <div className="h-screen bg-muted flex flex-col">
      <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">{companyName || t("CompanyReadonlyDetails")}</h1>
      </div>
      {loading ? (<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>) :
       error || !company ? (<div className="flex-1 flex items-center justify-center text-muted-foreground"><p>{t("Therewasanerror")}</p></div>) : (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="w-full aspect-video bg-muted overflow-hidden">
            {imageUrl ? (<img src={imageUrl} alt={companyName || "Company"} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />) : (
              <div className="w-full h-full flex items-center justify-center bg-accent/20"><Store className="text-muted-foreground" size={64} /></div>
            )}
          </div>
          <div className="flex flex-col items-center px-6 py-4 space-y-1">
            {[companyName, company.LineOneAddress, company.LineTwoAddress, company.LineThreeAddress, company.LineFourAddress, company.LineCountryAddress].map((line, i) => (
              <div key={i} className="w-full border-b border-border py-3">
                <p className="text-center text-sm font-medium text-foreground">{line || (i === 0 ? "—" : [t("1stlineAddress"), t("2ndlineAddress"), t("3rdlineAddress"), t("4thLineAddress"), t("Country")][i - 1])}</p>
              </div>
            ))}
          </div>
          <div className="flex-1" />
          <div className="px-6 pb-6 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="rounded-full" disabled={!mobile} onClick={handleSms}><MessageSquare size={16} className="mr-1" />{t("sms")}</Button>
              <Button variant="outline" className="rounded-full" disabled={!mobile} onClick={handlePhone}><Phone size={16} className="mr-1" />{t("call")}</Button>
              <Button variant="outline" className="rounded-full" disabled={!mobile} onClick={handleWhatsApp}>WhatsApp</Button>
              <Button variant="outline" className="rounded-full" disabled={!email} onClick={handleEmail}><Mail size={16} className="mr-1" />{t("Email")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyProfileReadonly;
