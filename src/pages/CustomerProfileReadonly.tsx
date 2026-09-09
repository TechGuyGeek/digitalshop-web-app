import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, User, MessageSquare, Phone, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import AdvertSlot from "@/components/adverts/AdvertSlot";
import { blockV1Customer, fetchV1AuthorizedCustomerProfile } from "@/lib/v1Api";
import { getMenuImageUrl } from "@/lib/authClient";
import { buildContactLinks } from "@/lib/companyContact";

interface AuthorizedCustomer {
  name?: string;
  image_path?: string;
  mobile_number?: string;
  email?: string | null;
  line_one_address?: string;
  line_two_address?: string;
  line_three_address?: string;
  line_four_address?: string;
  country?: string;
  delivery_notes?: string;
}

const CustomerProfileReadonly = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const orderId = searchParams.get("orderid") || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [customer, setCustomer] = useState<AuthorizedCustomer | null>(null);

  useEffect(() => {
    if (!orderId) { setLoading(false); setError(true); return; }
    fetchV1AuthorizedCustomerProfile(orderId)
      .then((result) => { setCustomer(result.customer as AuthorizedCustomer); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [orderId]);

  const mobile = String(customer?.mobile_number || "").trim();
  const email = String(customer?.email || "").trim();
  const links = buildContactLinks(mobile, email);
  const fields: Array<[string, string]> = customer ? [
    [t("Name"), String(customer.name || "")],
    [t("Mobile"), mobile],
    [t("1stlineAddress"), String(customer.line_one_address || "")],
    [t("2ndlineAddress"), String(customer.line_two_address || "")],
    [t("3rdlineAddress"), String(customer.line_three_address || "")],
    [t("4thLineAddress"), String(customer.line_four_address || "")],
    [t("Country"), String(customer.country || "")],
    [t("DeliveryNotes"), String(customer.delivery_notes || "")],
  ].filter(([, value]) => Boolean(value)) : [];

  const blockCustomer = async () => {
    if (!orderId || blocking) return;
    setBlocking(true);
    try {
      await blockV1Customer(orderId);
      toast.success("Customer blocked");
      navigate("/company-orders", { replace: true });
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Unable to block customer");
    } finally { setBlocking(false); }
  };

  const openContact = (url: string) => { if (url) window.location.href = url; };
  const imageUrl = customer?.image_path ? getMenuImageUrl(customer.image_path) : "";

  return (
    <div className="h-dvh bg-muted flex flex-col">
      <div className="bg-primary px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">Customer</h1>
      </div>
      <AdvertSlot position="topBanner" className="px-4 py-2" />
      <div className="flex-1 overflow-y-auto">
        {loading ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Loader2 className="animate-spin mb-4" size={32} /><p className="text-sm">{t("Pleasewait")}</p></div> : error || !customer ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><span className="text-4xl mb-4">⚠️</span><p className="text-sm">{t("Therewasanerror")}</p></div> : <div className="flex flex-col">
          <div className="w-full aspect-[4/3] bg-muted overflow-hidden">
            {imageUrl ? <img src={imageUrl} alt={customer.name || "Customer"} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/30 to-muted"><User className="text-muted-foreground" size={64} /></div>}
          </div>
          <div className="px-6 py-4 space-y-0">{fields.map(([label, value]) => <div key={label} className="py-3 border-b border-border"><p className="text-center text-base font-medium text-foreground">{value || label}</p></div>)}</div>
          <div className="grid grid-cols-2 gap-3 px-6 py-4">
            <Button variant="outline" className="rounded-full text-sm" disabled={!links.sms} onClick={() => openContact(links.sms)}><MessageSquare size={16} className="mr-1" />{t("sms")}</Button>
            <Button variant="outline" className="rounded-full text-sm" disabled={!links.phone} onClick={() => openContact(links.phone)}><Phone size={16} className="mr-1" />{t("call")}</Button>
            <Button variant="outline" className="rounded-full text-sm" disabled={!links.whatsapp} onClick={() => openContact(links.whatsapp)}>WhatsApp</Button>
            <Button variant="outline" className="rounded-full text-sm" disabled={!links.email} onClick={() => openContact(links.email)}><Mail size={16} className="mr-1" />{t("Email")}</Button>
            <Button variant="destructive" className="col-span-2 rounded-full text-sm" disabled={blocking} onClick={() => void blockCustomer()}><Shield size={16} className="mr-1" />{blocking ? t("Pleasewait") : "Block customer"}</Button>
          </div>
        </div>}
      </div>
    </div>
  );
};

export default CustomerProfileReadonly;
