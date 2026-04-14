import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SERVER_DOMAIN } from "@/lib/companyApi";
import { useLanguage } from "@/contexts/LanguageContext";

export interface ProductCardItem {
  ID: string;
  OrderName: string;
  OrderPrice?: string;
  OrderDesription?: string;
  imagepath?: string;
  MenuItemEnable?: string;
  MenuEnable?: string;
  companyid?: string;
  GroupID?: string;
}

interface ProductCardProps {
  product: ProductCardItem;
  groupId: string;
  companyId: string;
  groupName: string;
  onToggleUpdate?: (productId: string, newValue: string) => void;
}

function getImageUrl(path?: string) {
  if (!path) return "";
  const cleaned = path.startsWith("/") ? path.slice(1) : path;
  const withPrefix = cleaned.startsWith("menu1/") ? cleaned : "menu1/" + cleaned;
  return SERVER_DOMAIN + withPrefix;
}

async function saveToggle(payload: Record<string, string>): Promise<{ Result: boolean; Message?: string }> {
  const res = await fetch(SERVER_DOMAIN + "menu1/PHPwrite/CompanyMenu/SaveMenuGroupDetailsTogglexSecure.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

const ProductCard = ({ product, groupId, companyId, groupName, onToggleUpdate }: ProductCardProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState((product.MenuEnable ?? product.MenuItemEnable) === "1");
  const [toggling, setToggling] = useState(false);
  const toggleRef = useRef(false);

  const imgUrl = getImageUrl(product.imagepath);

  const openEdit = () => {
    const params = new URLSearchParams({
      productId: product.ID,
      groupId,
      companyId,
      groupName,
      name: product.OrderName || "",
      desc: product.OrderDesription || "",
      price: product.OrderPrice || "",
      image: product.imagepath || "",
    });
    navigate(`/edit-product?${params.toString()}`);
  };

  const handleToggle = async (checked: boolean) => {
    if (toggleRef.current) return;
    toggleRef.current = true;
    const prev = enabled;
    setEnabled(checked);
    setToggling(true);

    try {
      const stored = localStorage.getItem("digitalUser");
      let userId = "", userEmail = "", userPassword = "";
      if (stored) {
        const u = JSON.parse(stored);
        userId = String(u.PersonID || u.ID || u.id || "");
        userEmail = u.Email || u.email || "";
        userPassword = u.Password || u.password || "";
      }

      const result = await saveToggle({
        companyid: companyId,
        GroupID: groupId,
        ID: product.ID,
        MenuEnable: checked ? "1" : "0",
        UserID: userId,
        UserEmail: userEmail,
        UserPassword: userPassword,
      });

      if (!result.Result) {
        setEnabled(prev);
        toast.error(result.Message || "Failed to update toggle");
      } else {
        onToggleUpdate?.(product.ID, checked ? "1" : "0");
      }
    } catch {
      setEnabled(prev);
      toast.error("Network error updating toggle");
    } finally {
      setToggling(false);
      toggleRef.current = false;
    }
  };

  const statusText = enabled ? t("TheItemisEnabled") : t("Enabletodisplay");

  return (
    <div className="rounded-xl overflow-hidden bg-card border border-border shadow-lg">
      {/* Image header */}
      {imgUrl ? (
        <div className="relative h-52 w-full cursor-pointer" onClick={openEdit}>
          <img
            src={imgUrl}
            alt={product.OrderName}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-10 flex items-end justify-between">
            <span className="text-white font-bold text-base uppercase tracking-wide drop-shadow-md">
              {product.OrderName}
            </span>
            {product.OrderPrice && (
              <span className="text-white font-bold text-base drop-shadow-md">
                {parseFloat(product.OrderPrice).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          className="px-4 py-4 flex items-center justify-between bg-muted/30 cursor-pointer"
          onClick={openEdit}
        >
          <span className="font-bold text-foreground text-base uppercase tracking-wide">
            {product.OrderName}
          </span>
          {product.OrderPrice && (
            <span className="font-bold text-foreground text-base">
              {parseFloat(product.OrderPrice).toFixed(2)}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-3 space-y-3">
        {product.OrderDesription && product.OrderDesription !== "-" && (
          <p className="text-sm text-muted-foreground leading-relaxed">{product.OrderDesription}</p>
        )}

        {/* Toggle row */}
        <div className="flex items-center justify-between py-1">
          <span className={`text-sm font-medium ${enabled ? "text-foreground" : "text-muted-foreground"}`}>
            {statusText}
          </span>
          <div className="relative">
            {toggling && (
              <Loader2 className="absolute -left-6 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" size={14} />
            )}
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={toggling}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Button
            variant="secondary"
            size="sm"
            className="font-semibold"
            onClick={() => navigate(`/add-product?groupId=${groupId}&companyId=${companyId}&groupName=${encodeURIComponent(groupName)}`)}
          >
            {t("Add")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="font-semibold"
            onClick={openEdit}
          >
            {t("Edit")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="font-semibold"
            onClick={() => toast.info(t("Deletecomingsoon") !== "Deletecomingsoon" ? t("Deletecomingsoon") : "Delete coming soon")}
          >
            {t("Delete")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
