import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, User, MessageSquare, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DigitalPerson } from "@/lib/api";

const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

async function fetchCustomerProfile(userId: string): Promise<DigitalPerson | null> {
  const url = SERVER_DOMAIN + "menu1/PHPread/User/RetrievUserProfiledetails.php";
  const body = new URLSearchParams({ user_id: userId });
  const res = await fetch(url, { method: "POST", body }); if (!res.ok) return null;
  const data = await res.json(); const arr = Array.isArray(data) ? data : data?.data ? (Array.isArray(data.data) ? data.data : [data.data]) : [data];
  return arr.length > 0 ? arr[0] : null;
}

function getProfileImageUrl(person: DigitalPerson): string | null {
  const path = String(person.Imagepath || person.imagename || ""); if (!path) return null; if (path.startsWith("http")) return path;
  const clean = path.startsWith("/") ? path : "/" + path; return SERVER_DOMAIN + "menu1" + clean;
}

const CustomerProfileReadonly = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const userId = searchParams.get("userid") || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [person, setPerson] = useState<DigitalPerson | null>(null);

  useEffect(() => {
    if (!userId) { setLoading(false); setError(true); return; }
    localStorage.setItem("DontlogmeOut", "true");
    fetchCustomerProfile(userId).then((p) => { setPerson(p); if (!p) setError(true); }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [userId]);

  const mobile = person?.MobileNumber || "";
  const email = String(person?.Email || person?.email || "");
  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const normalizeForWhatsApp = (num: string): string => { let cleaned = num.replace(/[\s\-()]/g, ""); if (cleaned.startsWith("0")) cleaned = "44" + cleaned.slice(1); return cleaned; };

  const handleSms = () => { if (!mobile) return; if (isMobileDevice) window.open(`sms:${mobile}?body=${encodeURIComponent("Welcome to Digital shop")}`, "_self"); else { navigator.clipboard.writeText(mobile); toast.info(t("Therewasanerror")); } };
  const handlePhone = () => { if (!mobile) return; if (isMobileDevice) window.open(`tel:${mobile}`, "_self"); else { navigator.clipboard.writeText(mobile); toast.info(t("Therewasanerror")); } };
  const handleWhatsApp = () => { if (!mobile) return; window.open(`https://wa.me/${normalizeForWhatsApp(mobile)}?text=Welcome%20to%20Digital%20shop`, "_blank"); };
  const handleEmail = () => { if (!email) return; window.open(`mailto:${email}`, "_self"); };

  const imgUrl = person ? getProfileImageUrl(person) : null;
  const fields: { label: string; value: string }[] = person ? [
    { label: t("Name"), value: String(person.Name || person.name || "") },
    { label: t("LastName"), value: String(person.Surname || person.surname || "") },
    { label: t("Gender"), value: String(person.DateofBirth || "") },
    { label: t("Mobile"), value: mobile },
    { label: t("1stlineAddress"), value: String((person as any).LineOneAddress || "") },
    { label: t("2ndlineAddress"), value: String((person as any).LineTwoAddress || "") },
    { label: t("3rdlineAddress"), value: String((person as any).LineThreeAddress || "") },
    { label: t("4thLineAddress"), value: String((person as any).LineFourAddress || "") },
    { label: t("Country"), value: String((person as any).LineCountryAddress || "") },
    { label: t("DeliveryNotes"), value: String((person as any).LineDeliveryNotesAddress || "") },
  ] : [];

  return (
    <div className="h-screen bg-muted flex flex-col">
      <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">{t("CustomerReadonlyDetails")}</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Loader2 className="animate-spin mb-4" size={32} /><p className="text-sm">{t("Pleasewait")}</p></div>
        ) : error || !person ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><span className="text-4xl mb-4">⚠️</span><p className="text-sm">{t("Therewasanerror")}</p></div>
        ) : (
          <div className="flex flex-col">
            <div className="w-full aspect-[4/3] bg-muted overflow-hidden">
              {imgUrl ? (<img src={imgUrl} alt={String(person.Name || "Customer")} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }} />) : null}
              <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/30 to-muted ${imgUrl ? "hidden" : ""}`}><User className="text-muted-foreground" size={64} /></div>
            </div>
            <div className="px-6 py-4 space-y-0">
              {fields.map((f) => (<div key={f.label} className="py-3 border-b border-border"><p className="text-center text-base font-medium text-foreground">{f.value || f.label}</p></div>))}
            </div>
            <div className="grid grid-cols-2 gap-3 px-6 py-4">
              <Button variant="outline" className="rounded-full text-sm" disabled={!mobile} onClick={handleSms}><MessageSquare size={16} className="mr-1" />{t("sms")}</Button>
              <Button variant="outline" className="rounded-full text-sm" disabled={!mobile} onClick={handlePhone}><Phone size={16} className="mr-1" />{t("call")}</Button>
              <Button variant="outline" className="rounded-full text-sm" disabled={!mobile} onClick={handleWhatsApp}>WhatsApp</Button>
              <Button variant="outline" className="rounded-full text-sm" disabled={!email} onClick={handleEmail}><Mail size={16} className="mr-1" />{t("Email")}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerProfileReadonly;
