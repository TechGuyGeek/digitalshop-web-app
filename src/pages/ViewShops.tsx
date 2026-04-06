import { useNavigate } from "react-router-dom";
import { ArrowLeft, Store, Globe, CreditCard, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const ViewShops = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const shopCategories = [
    { label: t("FreeView"), icon: Store, description: t("Clickformoreinfo"), path: "/free-shops" },
    { label: t("PaidView"), icon: CreditCard, description: t("Clickformoreinfo"), path: "/paid-shops" },
    { label: t("ViewGlobalShops"), icon: Globe, description: t("Clickformoreinfo"), path: "/global-shops" },
    { label: t("Scan"), icon: QrCode, description: t("BarcodeGenerator"), path: "/qr-scanner" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate("/profile")}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">{t("ViewShops")}</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-4">
          {shopCategories.map((cat) => (
            <button key={cat.label} className="w-full group relative overflow-hidden rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98]" onClick={() => { if (cat.path) navigate(cat.path); }}>
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <cat.icon size={22} />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-foreground font-heading">{cat.label}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{cat.description}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ViewShops;
