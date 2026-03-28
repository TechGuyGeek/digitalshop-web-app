import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Share2, Clock, Activity, Store, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { fetchCompanyById, CompanyDetails } from "@/lib/api";
import { toast } from "sonner";

const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

function buildAddress(company: CompanyDetails): string {
  return [
    company.LineOneAddress,
    company.LineTwoAddress,
    company.LineThreeAddress,
    company.LineFourAddress,
    company.LineCountryAddress,
  ]
    .filter((line) => line && line.trim() !== "")
    .join(", ");
}

function formatOpeningHours(opening?: string, closing?: string): string | null {
  if (!opening || !closing) return null;
  const placeholders = ["opening times", "closing times", "00:00:00"];
  if (
    placeholders.includes(opening.toLowerCase()) ||
    placeholders.includes(closing.toLowerCase())
  )
    return null;
  // Strip seconds from "HH:MM:SS" → "HH:MM"
  const fmt = (t: string) => {
    const parts = t.split(":");
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
  };
  return `${fmt(opening)} to ${fmt(closing)}`;
}

function daysSinceActivity(lastLoggedOn?: string): number | null {
  if (!lastLoggedOn) return null;
  try {
    const d = new Date(lastLoggedOn);
    if (isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return null;
  }
}

function isShopOpen(opening?: string, closing?: string): boolean | null {
  if (!opening || !closing) return null;
  const placeholders = ["opening times", "closing times"];
  if (
    placeholders.includes(opening.toLowerCase()) ||
    placeholders.includes(closing.toLowerCase())
  )
    return null; // No valid hours — treat as always open

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const toMinutes = (t: string) => {
    const parts = t.split(":").map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  const openMin = toMinutes(opening);
  const closeMin = toMinutes(closing);

  if (closeMin > openMin) {
    return currentMinutes >= openMin && currentMinutes <= closeMin;
  }
  // Overnight hours (e.g. 22:00 to 06:00)
  return currentMinutes >= openMin || currentMinutes <= closeMin;
}

const ShopProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const companyIdParam = searchParams.get("companyid");
  const fallbackName = searchParams.get("name") || "Shop";
  const fallbackIcon = searchParams.get("icon") || "🏪";

  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = companyIdParam ? parseInt(companyIdParam, 10) : NaN;
    if (isNaN(id) || id <= 0) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    fetchCompanyById(id).then((data) => {
      if (data) {
        setCompany(data);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [companyIdParam]);

  const shopName = company?.companyname || fallbackName;
  const hours = company ? formatOpeningHours(company.OpeningTimes, company.ClosingTimes) : null;
  const activityDays = company ? daysSinceActivity(company.LastLoggedOn) : null;
  const address = company ? buildAddress(company) : "";
  const imageUrl = company?.companyphoto
    ? SERVER_DOMAIN + encodeURI(company.companyphoto)
    : "";

  const handleEnterShop = () => {
    if (!company) return;

    const openStatus = isShopOpen(company.OpeningTimes, company.ClosingTimes);
    if (openStatus === false) {
      toast.error(`${shopName} is currently closed. Opening hours: ${hours || "Not set"}`);
      return;
    }

    navigate(
      `/shop-interior?companyid=${company.companyid}&name=${encodeURIComponent(shopName)}`
    );
  };

  const handleShare = async () => {
    const description = company?.CompanyDescription || "";
    const shareText = `Check out ${shopName} on our app!\n\n${description}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shopName,
          text: shareText,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Shop details copied to clipboard!");
    }
  };

  const handleBack = () => {
    navigate("/view-shops");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <div className="bg-primary px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary/80"
            onClick={handleBack}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-lg font-bold text-primary-foreground font-heading">
            Shop Not Found
          </h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <AlertTriangle className="text-destructive" size={48} />
          <p className="text-muted-foreground text-center">
            This company could not be found. It may have been removed or the ID is invalid.
          </p>
          <Button variant="outline" onClick={handleBack}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={handleBack}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading truncate">
          {shopName}
        </h1>
      </div>

      {/* Shop image */}
      <div className="w-full h-48 bg-card flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={shopName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <span className={`text-5xl ${imageUrl ? "hidden" : ""}`}>
          {fallbackIcon}
        </span>
      </div>

      {/* Shop info */}
      <div className="flex-1 flex flex-col items-center px-6 pt-6 pb-28 text-center">
        {/* Activity */}
        {activityDays !== null && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Activity size={14} />
            <span>
              Shop Activity {activityDays === 0 ? "today" : `${activityDays} day${activityDays !== 1 ? "s" : ""} ago`}
            </span>
          </div>
        )}

        <h2 className="text-2xl font-bold text-foreground font-heading uppercase mb-2">
          {shopName}
        </h2>

        {/* Opening hours */}
        {hours && (
          <div className="flex items-center gap-2 text-foreground font-semibold text-base mb-2">
            <Clock size={16} />
            <span>{hours}</span>
          </div>
        )}

        {/* Address */}
        {address && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
            <Store size={14} />
            <span>{address}</span>
          </div>
        )}

        {/* Description */}
        {company?.CompanyDescription && (
          <p className="text-muted-foreground text-sm mt-2">
            {company.CompanyDescription}
          </p>
        )}

        {/* Contact info */}
        {(company?.CompanyMobile || company?.CompanyEmail) && (
          <div className="mt-4 text-sm text-muted-foreground space-y-1">
            {company.CompanyMobile && <p>📞 {company.CompanyMobile}</p>}
            {company.CompanyEmail && <p>✉️ {company.CompanyEmail}</p>}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-muted border-t border-border px-6 py-4 flex items-center justify-between max-w-[430px] mx-auto">
        <Button
          variant="outline"
          className="rounded-full px-6"
          onClick={handleEnterShop}
        >
          Enter Shop
        </Button>
        <Button
          variant="outline"
          className="rounded-full px-6 gap-2"
          onClick={handleShare}
        >
          <Share2 size={16} />
          Share
        </Button>
      </div>
    </div>
  );
};

export default ShopProfile;
