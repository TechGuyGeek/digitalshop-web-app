import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";
interface LiveOrderDetailItem { ID?: string; GroupID?: string; OrderName?: string; OrderDesription?: string; OrderPrice?: string; imagepathx?: string; Imagepath?: string; imagepath?: string; companyid?: string; clientid?: string; DateandTime?: string; [key: string]: unknown; }
const ENDPOINTS: Record<string, string> = { today: "RetriveLiveOrderDetails.php", week: "RetriveLiveOrderDetailsweek.php", month: "RetriveLiveOrderDetailsmonth.php" };

async function fetchOrderDetails(companyId: string, clientId: string, dateTime: string, range: string): Promise<LiveOrderDetailItem[]> {
  const endpoint = ENDPOINTS[range] || ENDPOINTS.today;
  const form = new URLSearchParams(); form.append("companyID", companyId); form.append("OrderResult", clientId); form.append("getDateandTime", dateTime);
  const res = await fetch(SERVER_DOMAIN + "menu1/PHPread/CompanyLiveOrders/" + endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
  const text = await res.text(); if (!text || text.trim() === "" || text.trim() === "[]") return [];
  const parsed = JSON.parse(text); return Array.isArray(parsed) ? parsed : [];
}

function resolveImage(item: LiveOrderDetailItem): string {
  const raw = item.imagepathx || item.Imagepath || item.imagepath || ""; if (!raw) return "";
  if (raw.startsWith("http")) return raw; const cleaned = raw.startsWith("/") ? raw.slice(1) : raw; return `${SERVER_DOMAIN}menu1/${cleaned}`;
}

function safePrice(val: unknown): number { if (val === undefined || val === null) return 0; const n = parseFloat(String(val)); return isNaN(n) ? 0 : n; }

const CompanyOrderDetail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const companyId = searchParams.get("companyid") || "";
  const clientId = searchParams.get("clientid") || "";
  const dateTime = searchParams.get("datetime") || "";
  const range = searchParams.get("range") || "today";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [items, setItems] = useState<LiveOrderDetailItem[]>([]);

  useEffect(() => {
    if (!companyId || !clientId || !dateTime) { setLoading(false); setError(true); return; }
    setLoading(true); setError(false);
    fetchOrderDetails(companyId, clientId, dateTime, range).then(setItems).catch(() => { setError(true); setItems([]); }).finally(() => setLoading(false));
  }, [companyId, clientId, dateTime, range]);

  const totalItems = items.length;
  const totalPrice = items.reduce((sum, it) => sum + safePrice(it.OrderPrice), 0);

  return (
    <div className="h-screen bg-muted flex flex-col">
      <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">{t("UserOrderDetails")}</h1>
      </div>
      {!loading && !error && items.length > 0 && (
        <div className="bg-card px-4 py-3 flex justify-between border-b border-border shrink-0">
          <div className="text-sm"><span className="font-semibold text-foreground">{t("Totalitems")}: </span><span className="text-foreground">{totalItems}</span></div>
          <div className="text-sm"><span className="font-semibold text-foreground">{t("TOTALPRICE")}: </span><span className="text-foreground">£{totalPrice.toFixed(2)}</span></div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (<div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Loader2 className="animate-spin mb-4" size={32} /><p className="text-sm">{t("Pleasewait")}</p></div>) :
         error ? (<div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><span className="text-4xl mb-4">⚠️</span><p className="text-sm">{t("Therewasanerror")}</p></div>) :
         items.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><ShoppingBag className="mb-4" size={40} /><p className="text-sm">{t("NoOrdersToshow")}</p></div>) : (
          items.map((item, idx) => {
            const imgSrc = resolveImage(item); const price = safePrice(item.OrderPrice);
            return (
              <div key={item.ID || idx} className="rounded-xl border border-border bg-card p-3 shadow-sm flex gap-3">
                <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                  {imgSrc ? (<img src={imgSrc} alt={item.OrderName || "Item"} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />) : (
                    <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="text-muted-foreground" size={24} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold text-foreground text-sm truncate">{item.OrderName || t("ItemName")}</p>
                  {item.OrderDesription && <p className="text-xs text-muted-foreground line-clamp-2">{item.OrderDesription}</p>}
                  <p className="text-sm font-bold text-primary">£{price.toFixed(2)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CompanyOrderDetail;
