import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, MessageSquare, Phone, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCompanyPhotoUrl, type CustomerOrderContact } from "@/lib/orderHistory";
import { buildContactLinks } from "@/lib/companyContact";

type ReadonlyCompanyContact = CustomerOrderContact;

const CompanyProfileReadonly = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const company = (location.state as { company?: ReadonlyCompanyContact } | null)?.company;
  if (!company) return <div className="h-dvh bg-muted flex flex-col"><div className="bg-primary px-4 py-4 flex items-center gap-3"><Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button><h1 className="text-lg font-bold text-primary-foreground">{t("CompanyReadonlyDetails")}</h1></div><div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground"><p>{t("Therewasanerror")}</p></div></div>;

  const links = buildContactLinks(company.mobileNumber, company.companyEmail);
  const address = [company.lineOneAddress, company.lineTwoAddress, company.lineThreeAddress, company.lineFourAddress, company.country].filter(Boolean);
  const open = (url: string) => { if (url) window.location.href = url; };
  return <div className="h-dvh bg-muted flex flex-col">
    <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0"><Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button><h1 className="text-lg font-bold text-primary-foreground font-heading truncate">{company.companyName || t("CompanyReadonlyDetails")}</h1></div>
    <div className="flex-1 overflow-y-auto flex flex-col"><div className="w-full aspect-video bg-muted overflow-hidden">{company.companyImagePath ? <img src={getCompanyPhotoUrl(company.companyImagePath)} alt={company.companyName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-accent/20"><Store className="text-muted-foreground" size={64} /></div>}</div>
      <div className="px-6 py-4 space-y-1"><div className="border-b border-border py-3"><p className="text-center text-sm font-medium">{company.companyName || "—"}</p></div>{address.map((line, index) => <div key={`${line}-${index}`} className="border-b border-border py-3"><p className="text-center text-sm">{line}</p></div>)}{company.description && <p className="text-sm text-muted-foreground pt-4">{company.description}</p>}</div><div className="flex-1" />
      <div className="px-6 pb-6 pt-4"><div className="grid grid-cols-2 gap-3"><Button variant="outline" className="rounded-full" disabled={!links.sms} onClick={() => open(links.sms)}><MessageSquare size={16} className="mr-1" />{t("sms")}</Button><Button variant="outline" className="rounded-full" disabled={!links.phone} onClick={() => open(links.phone)}><Phone size={16} className="mr-1" />{t("call")}</Button><Button variant="outline" className="rounded-full" disabled={!links.whatsapp} onClick={() => open(links.whatsapp)}>WhatsApp</Button><Button variant="outline" className="rounded-full" disabled={!links.email} onClick={() => open(links.email)}><Mail size={16} className="mr-1" />{t("Email")}</Button></div></div>
    </div>
  </div>;
};

export default CompanyProfileReadonly;
