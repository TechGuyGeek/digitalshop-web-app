import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Store, MessageSquare, Phone, Mail, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

interface CompanyData {
  CompanyID?: string;
  CompanyName?: string;
  companyphoto?: string;
  LineOneAddress?: string;
  LineTwoAddress?: string;
  LineThreeAddress?: string;
  LineFourAddress?: string;
  LineCountryAddress?: string;
  CompanyMobile?: string;
  CompanyEmail?: string;
  [key: string]: any;
}

async function fetchCompanyProfile(companyId: string): Promise<CompanyData | null> {
  const url = SERVER_DOMAIN + "menu1/PHPread/Company/RetrieveCompanyProfiledetails2.php";
  const body = new URLSearchParams({ CompanyID: companyId });
  const res = await fetch(url, { method: "POST", body });
  if (!res.ok) return null;
  const data = await res.json();
  const arr = Array.isArray(data) ? data : data?.data ? (Array.isArray(data.data) ? data.data : [data.data]) : [data];
  return arr.length > 0 ? arr[0] : null;
}

function getCompanyImageUrl(photo: string | undefined): string | null {
  const path = String(photo || "");
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/") ? path : "/" + path;
  return SERVER_DOMAIN + "menu1" + clean;
}

const CompanyProfileReadonly = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get("companyid") || "";

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!companyId) { setLoading(false); setError(true); return; }
    fetchCompanyProfile(companyId)
      .then((c) => { setCompany(c); if (!c) setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [companyId]);

  // API returns lowercase "companyname" but interface has "CompanyName"
  const companyName = company?.CompanyName || company?.companyname || "";
  const imageUrl = company ? getCompanyImageUrl(company.companyphoto) : null;
  const mobile = company?.CompanyMobile || "";
  const email = company?.CompanyEmail || "";

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const normalizeForWhatsApp = (num: string): string => {
    let cleaned = num.replace(/[\s\-()]/g, "");
    if (cleaned.startsWith("0")) cleaned = "44" + cleaned.slice(1);
    if (!cleaned.startsWith("+")) cleaned = cleaned;
    return cleaned;
  };

  const handleSms = () => {
    if (!mobile) return;
    if (isMobile) {
      window.open(`sms:${mobile}?body=Welcome to Digital shop`, "_blank");
    } else {
      navigator.clipboard.writeText(mobile);
      toast.info("Phone number copied – SMS works best on mobile devices");
    }
  };

  const handlePhone = () => {
    if (!mobile) return;
    if (isMobile) {
      window.open(`tel:${mobile}`, "_blank");
    } else {
      navigator.clipboard.writeText(mobile);
      toast.info("Phone number copied – calling works best on mobile devices");
    }
  };

  const handleWhatsApp = () => {
    if (!mobile) return;
    const num = normalizeForWhatsApp(mobile);
    window.open(`https://wa.me/${num}?text=Welcome%20to%20Digital%20shop`, "_blank");
  };

  const handleEmail = () => {
    if (!email) return;
    window.open(`mailto:${email}`, "_blank");
  };

  return (
    <div className="h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">
          {companyName || "Company Profile"}
        </h1>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      ) : error || !company ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>Company profile not found</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Company Image */}
          <div className="w-full aspect-video bg-muted overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={companyName || "Company"}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-accent/20">
                <Store className="text-muted-foreground" size={64} />
              </div>
            )}
          </div>

          {/* Info Fields */}
          <div className="flex flex-col items-center px-6 py-4 space-y-1">
            {[
              companyName,
              company.LineOneAddress,
              company.LineTwoAddress,
              company.LineThreeAddress,
              company.LineFourAddress,
              company.LineCountryAddress,
            ].map((line, i) => (
              <div key={i} className="w-full border-b border-border py-3">
                <p className="text-center text-sm font-medium text-foreground">
                  {line || (i === 0 ? "—" : ["1st line Address", "2nd line Address", "3rd line Address", "4th line Address", "Country"][i - 1])}
                </p>
              </div>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Contact Actions */}
          <div className="px-6 pb-6 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="rounded-full"
                disabled={!mobile}
                onClick={handleSms}
              >
                <MessageSquare size={16} className="mr-1" /> SMS
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                disabled={!mobile}
                onClick={handlePhone}
              >
                <Phone size={16} className="mr-1" /> Phone
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                disabled={!mobile}
                onClick={handleWhatsApp}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                disabled={!email}
                onClick={handleEmail}
              >
                <Mail size={16} className="mr-1" /> Email
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyProfileReadonly;
