import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, Image as ImageIcon, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SERVER_DOMAIN } from "@/lib/companyApi";
import { useLanguage } from "@/contexts/LanguageContext";

function getImageUrl(path?: string) {
  if (!path) return "";
  const cleaned = path.startsWith("/") ? path.slice(1) : path;
  const withPrefix = cleaned.startsWith("menu1/") ? cleaned : "menu1/" + cleaned;
  return SERVER_DOMAIN + withPrefix;
}

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

function escapeApostrophes(str: string) {
  return str.replace(/'/g, "\\'");
}

const EditProduct = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const productId = searchParams.get("productId") || "";
  const groupId = searchParams.get("groupId") || "";
  const companyId = searchParams.get("companyId") || "";
  const groupName = searchParams.get("groupName") || "Products";
  const initialName = searchParams.get("name") || "";
  const initialDesc = searchParams.get("desc") || "";
  const initialPrice = searchParams.get("price") || "";
  const initialImage = searchParams.get("image") || "";
  const initialMenuEnable = searchParams.get("menuEnable") || "";
  const [name, setName] = useState(initialName); const [description, setDescription] = useState(initialDesc);
  const [price, setPrice] = useState(initialPrice); const [imagePreview, setImagePreview] = useState(getImageUrl(initialImage));
  const [newImageBase64, setNewImageBase64] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const [menuEnable, setMenuEnable] = useState(initialMenuEnable || "1");
  const fileInputRef = useRef<HTMLInputElement>(null); const cameraInputRef = useRef<HTMLInputElement>(null);
  const backUrl = `/group-products?groupId=${groupId}&companyId=${companyId}&groupName=${encodeURIComponent(groupName)}`;

  useEffect(() => {
    if (!groupId || !productId || initialMenuEnable) return;
    const form = new URLSearchParams();
    form.append("GroupID", groupId);
    fetch(SERVER_DOMAIN + "menu1/PHPread/CompanyMenu/PoppulateSubMenu1.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    })
      .then((res) => res.json())
      .then((data: Array<{ ID?: string; MenuEnable?: string; MenuItemEnable?: string }>) => {
        if (!Array.isArray(data)) return;
        const current = data.find((item) => String(item.ID || "") === productId);
        const currentEnable = String(current?.MenuEnable ?? current?.MenuItemEnable ?? "").trim();
        if (currentEnable === "0" || currentEnable === "1") setMenuEnable(currentEnable);
      })
      .catch(() => {});
  }, [groupId, productId, initialMenuEnable]);

  const handleFileSelect = async (file: File) => {
    try { const base64 = await resizeAndConvertToBase64(file); setNewImageBase64(base64); setImagePreview(`data:image/jpeg;base64,${base64}`); } catch { toast.error(t("SaveFailed")); }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error(t("ItemName")); return; }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) { toast.error(t("ErrorwithPrice")); return; }
    const stored = localStorage.getItem("digitalUser"); let userId = "", userEmail = "", userPassword = "";
    if (stored) { try { const user = JSON.parse(stored); userId = String(user.PersonID || user.ID || ""); userEmail = user.Email || user.email || ""; userPassword = user.Password || user.password || ""; } catch {} }
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        ID: productId,
        GroupID: groupId,
        companyid: companyId,
        OrderName: escapeApostrophes(name.trim()),
        OrderDesription: escapeApostrophes(description.trim()),
        OrderPrice: priceNum.toFixed(2),
        SelectImage: newImageBase64 || "0",
        MenuEnable: menuEnable === "0" ? "0" : "1",
        UserID: userId,
        UserEmail: userEmail,
        UserPassword: userPassword,
      };
      const res = await fetch(SERVER_DOMAIN + "menu1/PHPwrite/CompanyMenu/SaveMenuGroupDetailsTogglexSecure.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.Result === true || data?.Message === "Menu item updated") { toast.success(t("SaveSuccessful")); navigate(backUrl); }
      else { toast.error(data?.Message || data?.ServerMessage || t("SaveFailed")); }
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
          {imagePreview ? (<img src={imagePreview} alt={name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground"><ImageIcon size={48} /></div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 p-4">
          <Button variant="outline" onClick={() => cameraInputRef.current?.click()}><Camera size={16} className="mr-1" />{t("Camera")}</Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}><ImageIcon size={16} className="mr-1" />{t("Gallery")}</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Save size={16} className="mr-1" />}{t("Save")}</Button>
        </div>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); e.target.value = ""; }} />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); e.target.value = ""; }} />
        <div className="p-4 space-y-4">
          <div><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("ItemName")} className="text-center font-bold text-foreground" /></div>
          <div className="border-t border-border" />
          <div><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("ItemDescription")} rows={4} className="text-foreground" /></div>
          <div className="border-t border-border" />
          <div><Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t("Price")} type="number" step="0.01" min="0" className="text-center font-bold text-foreground" /></div>
          <Button className="w-full max-w-[200px] mx-auto block" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Save size={16} className="mr-1" />}{t("Save")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditProduct;
