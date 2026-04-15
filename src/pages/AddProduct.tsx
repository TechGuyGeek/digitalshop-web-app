import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, Image as ImageIcon, Save, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SERVER_DOMAIN } from "@/lib/companyApi";
import { useLanguage } from "@/contexts/LanguageContext";
import VideoAdvert from "@/components/adverts/VideoAdvert";
import { ADVERT_LIBRARY, ADVERT_SETTINGS, VIDEO_TRIGGERS } from "@/lib/advertConfig";

function resizeAndConvertToBase64(file: File, maxSize = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) { if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; } else { w = Math.round(w * maxSize / h); h = maxSize; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.onerror = reject; img.src = e.target?.result as string;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

function escapeApostrophes(str: string): string { return str.replace(/'/g, "\\'"); }

const AddProduct = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const groupId = searchParams.get("groupId") || "";
  const companyId = searchParams.get("companyId") || "";
  const groupName = searchParams.get("groupName") || "Products";
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [price, setPrice] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null); const [imageBase64, setImageBase64] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null); const cameraInputRef = useRef<HTMLInputElement>(null);
  const backUrl = `/group-products?groupId=${groupId}&companyId=${companyId}&groupName=${encodeURIComponent(groupName)}`;

  const handleFileSelect = async (file: File) => {
    try { const base64 = await resizeAndConvertToBase64(file); setImageBase64(base64); setImagePreview(`data:image/jpeg;base64,${base64}`); } catch { toast.error(t("SaveFailed")); }
  };

  const handleSave = async () => {
    const priceStr = price.trim() || "0.00"; const priceNum = parseFloat(priceStr);
    if (isNaN(priceNum) || priceNum < 0) { toast.error(t("ErrorwithPrice")); return; }
    const finalName = name.trim() || "-"; const finalDesc = description.trim() || "-";
    const stored = localStorage.getItem("digitalUser"); let userId = "", userEmail = "", userPassword = "";
    if (stored) { try { const user = JSON.parse(stored); userId = user.PersonID || user.ID || ""; userEmail = user.Email || user.email || ""; userPassword = user.Password || user.password || ""; } catch {} }
    setSaving(true);
    try {
      const payload = { companyid: companyId, GroupID: groupId, OrderName: escapeApostrophes(finalName), OrderDesription: escapeApostrophes(finalDesc), OrderPrice: priceNum.toFixed(2), imageobject: imageBase64, UserID: userId, UserEmail: userEmail, UserPassword: userPassword };
      const res = await fetch(SERVER_DOMAIN + "menu1/PHPwrite/CompanyMenu/SaveMenuItemSecure.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data?.Result === true) { toast.success(data.Message || t("SaveSuccessful")); navigate(backUrl); }
      else { toast.error(data?.Message || t("SaveFailed")); }
    } catch { toast.error(t("Pleasecheckyourinternetconnection")); } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(backUrl)}><ArrowLeft size={20} /></Button>
        <h1 className="text-lg font-bold text-foreground flex-1 text-center pr-10">{t("CompanyMenuDetailsPageTitle")}</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="w-full h-56 bg-muted flex items-center justify-center overflow-hidden">
          {imagePreview ? (<img src={imagePreview} alt="Product preview" className="w-full h-full object-cover" />) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center"><ShoppingBag size={40} className="text-muted-foreground" /></div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <Button variant="outline" className="h-11" onClick={() => cameraInputRef.current?.click()}><Camera size={16} className="mr-2" />{t("Camera")}</Button>
          <Button variant="outline" className="h-11" onClick={() => fileInputRef.current?.click()}><ImageIcon size={16} className="mr-2" />{t("Gallery")}</Button>
        </div>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); e.target.value = ""; }} />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); e.target.value = ""; }} />
        <div className="p-4 space-y-4">
          <div className="space-y-1.5"><label className="text-sm font-medium text-foreground">{t("ItemName")}</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("ItemName")} className="text-foreground" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium text-foreground">{t("ItemDescription")}</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("ItemDescription")} rows={4} className="text-foreground" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium text-foreground">{t("Price")}</label><Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" type="number" step="0.01" min="0" className="text-foreground" /></div>
          <Button className="w-full mt-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
            {saving ? t("Pleasewait") : t("Save")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
