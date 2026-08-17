import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, Image as ImageIcon, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SERVER_DOMAIN } from "@/lib/companyApi";
import { updateProduct, listProducts } from "@/lib/menuApi";
import { useLanguage } from "@/contexts/LanguageContext";
import ProfileHelpAssistant from "@/components/ProfileHelpAssistant";

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

interface ProductLookupItem {
  ID?: string;
  ImageSize?: string;
  MenuEnable?: string;
  MenuItemEnable?: string;
  imagepath?: string;
}

interface EditProductResponse {
  Error?: string;
  Message?: string;
  Result?: boolean;
  ServerMessage?: string;
  [key: string]: unknown;
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
  const [name, setName] = useState(initialName); const [description, setDescription] = useState(initialDesc);
  const [price, setPrice] = useState(initialPrice); const [imagePreview, setImagePreview] = useState(getImageUrl(initialImage));
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [newImageBase64, setNewImageBase64] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const initialImageSize = searchParams.get("imageSize") || "";
  const [currentImagePath, setCurrentImagePath] = useState(initialImage);
  const [currentImageSize, setCurrentImageSize] = useState(initialImageSize);
  const fileInputRef = useRef<HTMLInputElement>(null); const cameraInputRef = useRef<HTMLInputElement>(null);
  const backUrl = `/group-products?groupId=${groupId}&companyId=${companyId}&groupName=${encodeURIComponent(groupName)}`;

  useEffect(() => {
    if (!groupId || !productId || (initialImage && initialImageSize)) return;
    listProducts(Number(groupId))
      .then((data) => {
        if (!Array.isArray(data)) return;
        const current = data.find((item) => String(item.id || "") === productId);
        if (!current) return;

        const nextImagePath = String(current.image_path || "").trim();
        const nextImageSize = String(current.image_size || "").trim();

        if (nextImagePath) {
          setCurrentImagePath(nextImagePath);
          if (!initialImage) {
            setImagePreview(getImageUrl(nextImagePath));
            setImageLoadFailed(false);
          }
        }

        if (nextImageSize) setCurrentImageSize(nextImageSize);
      })
      .catch(() => {});
  }, [groupId, productId, initialImage, initialImageSize]);

  const handleFileSelect = async (file: File) => {
    try {
      const base64 = await resizeAndConvertToBase64(file);
      setNewImageBase64(base64);
      setImagePreview(`data:image/jpeg;base64,${base64}`);
      setImageLoadFailed(false);
    } catch { toast.error(t("SaveFailed")); }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error(t("ItemName")); return; }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) { toast.error(t("ErrorwithPrice")); return; }

    setSaving(true);
    try {
      await updateProduct(Number(productId), { name: name.trim(), description: description.trim(), price: priceNum.toFixed(2), image_base64: newImageBase64 || undefined });
      toast.success(t("SaveSuccessful")); navigate(backUrl);
    } catch (error) {
      console.error("[EditProduct] network error:", error);
      toast.error(error instanceof TypeError ? "Network error while saving this product." : "Unexpected error while saving this product.");
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(backUrl)}><ArrowLeft size={20} /></Button>
        <h1 className="text-lg font-bold text-foreground flex-1 text-center pr-10">{t("CompanyMenuDetailsPageTitle")}</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ProfileHelpAssistant translationKey="HELPEDITDETAILSFULL" />
        <div className="w-full h-56 bg-muted flex items-center justify-center overflow-hidden">
          {imagePreview && !imageLoadFailed ? (<img key={imagePreview} src={imagePreview} alt={name || "Product image"} className="w-full h-full object-cover" onError={() => setImageLoadFailed(true)} />) : (
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
