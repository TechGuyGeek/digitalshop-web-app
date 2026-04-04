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
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                disabled={!mobile}
                onClick={() => mobile && window.open(`sms:${mobile}?body=Welcome to Digital shop`, "_blank")}
              >
                <MessageSquare size={16} className="mr-1" /> sms
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                disabled={!mobile}
                onClick={() => mobile && window.open(`tel:${mobile}`, "_blank")}
              >
                <Phone size={16} className="mr-1" /> phone
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                disabled={!email}
                onClick={() => email && window.open(`mailto:${email}`, "_blank")}
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
