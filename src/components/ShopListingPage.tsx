import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, List, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShopListingPageProps {
  title: string;
  shops?: { name: string; icon: string }[];
}

const placeholderShops = [
  { name: "test", icon: "📍" },
  { name: "The Big Shop", icon: "🧸" },
  { name: "Micks gaff", icon: "🍻" },
  { name: "test", icon: "👕" },
];

const tabs = [
  { id: "hybrid", label: "Hybrid View", icon: Layers },
  { id: "map", label: "Map View", icon: MapPin },
  { id: "list", label: "List View", icon: List },
] as const;

type TabId = (typeof tabs)[number]["id"];

const ShopListingPage = ({ title, shops = placeholderShops }: ShopListingPageProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("hybrid");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() => navigate("/view-shops")}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">
          {title}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 flex flex-col">
        {activeTab === "hybrid" && (
          <>
            {/* Map placeholder */}
            <div className="h-56 bg-muted flex items-center justify-center text-muted-foreground text-sm">
              <MapPin size={24} className="mr-2 opacity-50" />
              Map will appear here
            </div>
            {/* Shop list */}
            <ShopList shops={shops} />
          </>
        )}

        {activeTab === "map" && (
          <div className="flex-1 bg-muted flex items-center justify-center text-muted-foreground text-sm">
            <MapPin size={24} className="mr-2 opacity-50" />
            Full map will appear here
          </div>
        )}

        {activeTab === "list" && <ShopList shops={shops} />}
      </div>
    </div>
  );
};

const ShopList = ({ shops }: { shops: { name: string; icon: string }[] }) => (
  <div className="divide-y divide-border">
    {shops.map((shop, i) => (
      <button
        key={i}
        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-accent/50 transition-colors"
      >
        <span className="text-2xl">{shop.icon}</span>
        <span className="text-sm font-medium text-foreground">{shop.name}</span>
      </button>
    ))}
  </div>
);

export default ShopListingPage;
