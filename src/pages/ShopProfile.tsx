import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Share2, Clock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

const ShopProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const shopName = searchParams.get("name") || "Shop";
  const shopIcon = searchParams.get("icon") || "🏪";

  // Placeholder data — will be replaced with PHP API data later
  const shop = {
    name: shopName,
    icon: shopIcon,
    image: "",
    activityDays: 0,
    openingHours: "06:00 to 23:00",
    description: "This is a shop",
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: shop.name, text: shop.description });
    }
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">
          {shop.name}
        </h1>
      </div>

      {/* Shop image / placeholder */}
      <div className="w-full h-48 bg-card flex items-center justify-center overflow-hidden">
        {shop.image ? (
          <img
            src={shop.image}
            alt={shop.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl">{shop.icon}</span>
        )}
      </div>

      {/* Shop info */}
      <div className="flex-1 flex flex-col items-center px-6 pt-6 pb-24 text-center">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          <Activity size={14} />
          <span>Shop Activity {shop.activityDays} Days ago</span>
        </div>

        <h2 className="text-2xl font-bold text-foreground font-heading uppercase mb-2">
          {shop.name}
        </h2>

        <div className="flex items-center gap-2 text-foreground font-semibold text-base mb-4">
          <Clock size={16} />
          <span>{shop.openingHours}</span>
        </div>

        <p className="text-muted-foreground text-sm">{shop.description}</p>
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-muted border-t border-border px-6 py-4 flex items-center justify-between">
        <Button
          variant="outline"
          className="rounded-full px-6"
          onClick={() =>
            navigate(`/shop-interior?name=${encodeURIComponent(shopName)}`)
          }
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
