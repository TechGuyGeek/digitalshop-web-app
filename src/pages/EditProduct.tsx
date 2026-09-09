import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, Image as ImageIcon, Save, Loader2, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import ProfileHelpAssistant from "@/components/ProfileHelpAssistant";
import WebcamCapture from "@/components/WebcamCapture";
import ProductMedia from "@/components/ProductMedia";
import { addProductImage, listProducts, removeProductImage, setPrimaryProductImage, updateProduct, type ProductV1 } from "@/lib/menuApi";
import { fetchV1ProStatus } from "@/lib/v1Api";
import { getMenuImageUrl } from "@/lib/authClient";

function resizeAndConvertToBase64(file: File, maxSize = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = Math.round(height * maxSize / width); width = maxSize; }
          else { width = Math.round(width * maxSize / height); height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.onerror = reject;
      img.src = String(event.target?.result || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function legacyProEntitlement(): boolean {
  try {
    const stored = localStorage.getItem("digitalUser");
    if (!stored) return false;
    const user = JSON.parse(stored) as Record<string, unknown>;
    return String(user.PaidUser ?? user.Paiduser ?? "") === "2";
  } catch {
    return false;
  }
}

const EditProduct = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const productId = searchParams.get("productId") || "";
  const groupId = searchParams.get("groupId") || "";
  const companyId = searchParams.get("companyId") || "";
  const groupName = searchParams.get("groupName") || "Products";
  const [name, setName] = useState(searchParams.get("name") || "");
  const [description, setDescription] = useState(searchParams.get("desc") || "");
  const [price, setPrice] = useState(searchParams.get("price") || "");
  const [images, setImages] = useState<string[]>([]);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeDirty, setYoutubeDirty] = useState(false);
  const [newImageBase64, setNewImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState(searchParams.get("image") ? getMenuImageUrl(searchParams.get("image")) : "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingImage, setWorkingImage] = useState(false);
  const [isPro, setIsPro] = useState(legacyProEntitlement());
  const [webcamOpen, setWebcamOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const backUrl = `/group-products?groupId=${groupId}&companyId=${companyId}&groupName=${encodeURIComponent(groupName)}`;

  useEffect(() => {
    if (!companyId || !groupId || !productId) { setLoading(false); return; }
    let cancelled = false;
    Promise.all([listProducts(Number(companyId), Number(groupId)), fetchV1ProStatus().catch(() => ({}))])
      .then(([products, status]) => {
        if (cancelled) return;
        const product: ProductV1 | undefined = products.find((item) => String(item.id) === productId);
        if (product) {
          setName(product.name);
          setDescription(product.description);
          setPrice(product.price);
          const nextImages = product.images.length > 0 ? product.images : (product.image_path ? [product.image_path] : []);
          setImages(nextImages);
          setImagePreview(nextImages[0] ? getMenuImageUrl(nextImages[0]) : "");
          setYoutubeVideoId(product.youtube_video_id);
          setYoutubeUrl(product.youtube_video_id ? `https://www.youtube.com/watch?v=${product.youtube_video_id}` : "");
        }
        setIsPro(status.is_pro === true || String(status.paid_user ?? status.Paiduser ?? "") === "2" || legacyProEntitlement());
      })
      .catch(() => toast.error("Unable to load product"))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [companyId, groupId, productId]);

  const handlePrimaryFile = async (file: File) => {
    try {
      const base64 = await resizeAndConvertToBase64(file);
      setNewImageBase64(base64);
      setImagePreview(`data:image/jpeg;base64,${base64}`);
    } catch { toast.error(t("SaveFailed")); }
  };

  const handleGalleryFile = async (file: File) => {
    try {
      setWorkingImage(true);
      const base64 = await resizeAndConvertToBase64(file);
      const result = await addProductImage(Number(companyId), Number(productId), base64);
      const next = result.images || [];
      setImages(next);
      setImagePreview(next[0] ? getMenuImageUrl(next[0]) : "");
      toast.success(t("DetailswereSaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add image");
    } finally { setWorkingImage(false); }
  };

  const handleWebcamCapture = (base64: string) => {
    setNewImageBase64(base64);
    setImagePreview(`data:image/jpeg;base64,${base64}`);
  };

  const handleCameraClick = () => {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    if (mobile) cameraInputRef.current?.click();
    else setWebcamOpen(true);
  };

  const removeImage = async (path: string) => {
    try {
      setWorkingImage(true);
      const result = await removeProductImage(Number(companyId), Number(productId), path);
      const next = result.images || [];
      setImages(next);
      setImagePreview(next[0] ? getMenuImageUrl(next[0]) : "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove image");
    } finally { setWorkingImage(false); }
  };

  const promoteImage = async (path: string) => {
    try {
      setWorkingImage(true);
      const result = await setPrimaryProductImage(Number(companyId), Number(productId), path);
      const next = result.images || images;
      setImages(next);
      setImagePreview(next[0] ? getMenuImageUrl(next[0]) : "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to set primary image");
    } finally { setWorkingImage(false); }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error(t("ItemName")); return; }
    const priceNumber = parseFloat(price);
    if (Number.isNaN(priceNumber) || priceNumber < 0) { toast.error(t("ErrorwithPrice")); return; }
    setSaving(true);
    try {
      await updateProduct(Number(companyId), Number(productId), {
        name: name.trim(),
        description: description.trim(),
        price: priceNumber.toFixed(2),
        image_base64: newImageBase64 || undefined,
        ...(youtubeDirty && isPro ? { youtube_video_url: youtubeUrl.trim() } : {}),
      });
      toast.success(t("SaveSuccessful"));
      navigate(backUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("SaveFailed"));
    } finally { setSaving(false); }
  };

  const previewImages = newImageBase64 && imagePreview ? [imagePreview, ...images.slice(1)] : images;
  const canAddProductImage = images.length === 0 || isPro;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(backUrl)}><ArrowLeft size={20} /></Button>
        <h1 className="text-lg font-bold text-foreground flex-1 text-center pr-10">{t("CompanyMenuDetailsPageTitle")}</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ProfileHelpAssistant translationKey="HELPEDITDETAILSFULL" />
        {loading && <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>}
          <div className="h-64 p-4"><ProductMedia images={previewImages} youtubeVideoId={youtubeVideoId} alt={name || "Product"} /></div>
          <div className="grid grid-cols-3 gap-3 p-4">
            <Button variant="outline" onClick={handleCameraClick}><Camera size={16} className="mr-1" />{t("Camera")}</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={workingImage || images.length >= 5 || !canAddProductImage}><ImageIcon size={16} className="mr-1" />{t("Gallery")}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Save size={16} className="mr-1" />}{t("Save")}</Button>
          </div>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handlePrimaryFile(file); event.target.value = ""; }} />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleGalleryFile(file); event.target.value = ""; }} />
          <div className="px-4 space-y-3">
            <p className="text-xs text-muted-foreground">Product images are ordered; the first image is free. Additional images are available with GPS Shops Pro and remain server-gated.</p>
            {images.map((path, index) => <div key={path} className="flex items-center gap-2 rounded-lg border border-border p-2">
              <img src={getMenuImageUrl(path)} alt={`Product ${index + 1}`} className="h-14 w-14 rounded object-cover" />
              <span className="flex-1 text-xs truncate">{index === 0 ? "Primary image" : `Image ${index + 1}`}</span>
              <Button size="icon" variant={index === 0 ? "secondary" : "outline"} onClick={() => void promoteImage(path)} disabled={workingImage || index === 0} aria-label="Set primary"><Star size={15} /></Button>
              <Button size="icon" variant="outline" onClick={() => void removeImage(path)} disabled={workingImage} aria-label="Remove image"><Trash2 size={15} /></Button>
            </div>)}
          </div>
          <div className="p-4 space-y-4">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("ItemName")} className="text-center font-bold text-foreground" />
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("ItemDescription")} rows={4} className="text-foreground" />
            <Input value={price} onChange={(event) => setPrice(event.target.value)} placeholder={t("Price")} type="number" step="0.01" min="0" className="text-center font-bold text-foreground" />
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">YouTube video {isPro ? "" : "(Pro)"}</label>
              <Input value={youtubeUrl} onChange={(event) => { setYoutubeUrl(event.target.value); setYoutubeDirty(true); }} placeholder="https://www.youtube.com/watch?v=M7lc1UVf-VE" disabled={!isPro} className="text-foreground" />
              <p className="text-xs text-muted-foreground">{isPro ? "Clear the field to remove the video. The server validates and normalizes the URL." : "Product video is available with GPS Shops Pro."}</p>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>{saving ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Save size={16} className="mr-1" />}{t("Save")}</Button>
          </div>
      </div>
      <WebcamCapture open={webcamOpen} onOpenChange={setWebcamOpen} onCapture={handleWebcamCapture} maxSize={800} />
    </div>
  );
};

export default EditProduct;
