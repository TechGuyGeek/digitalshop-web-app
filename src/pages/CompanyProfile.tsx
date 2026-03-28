import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Image as ImageIcon, Save, Trash2 } from "lucide-react";
import MapMarkerPicker from "@/components/MapMarkerPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import WebcamCapture from "@/components/WebcamCapture";

const MAX_IMAGE_SIZE = 800;

function resizeAndConvertToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > MAX_IMAGE_SIZE || h > MAX_IMAGE_SIZE) {
          if (w > h) { h = Math.round(h * MAX_IMAGE_SIZE / w); w = MAX_IMAGE_SIZE; }
          else { w = Math.round(w * MAX_IMAGE_SIZE / h); h = MAX_IMAGE_SIZE; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataUrl.split(",")[1]);
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const CompanyProfile = () => {
  const navigate = useNavigate();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);

  const [form, setForm] = useState({
    shopName: "",
    mobileNumber: "",
    companyEmail: "",
    lineOne: "",
    lineTwo: "",
    lineThree: "",
    lineFour: "",
    country: "",
    openTime: "06:00",
    closeTime: "23:00",
    notificationCount: "24",
    notifications: "",
    description: "",
  });

  const [toggles, setToggles] = useState({
    liveOrders: true,
    takeaways: true,
    deliveries: true,
    allowGlobal: false,
  });

  const [shopImage, setShopImage] = useState<string>("");
  const [markerPickerOpen, setMarkerPickerOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState({ emoji: "🧸", label: "TOYS ICON" });

  useEffect(() => {
    const stored = localStorage.getItem("digitalUser");
    if (!stored) {
      navigate("/");
      return;
    }
  }, [navigate]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggle = (field: string, value: boolean) => {
    setToggles((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelected = async (file: File) => {
    try {
      const base64 = await resizeAndConvertToBase64(file);
      setPendingImageBase64(base64);
      setShopImage(`data:image/jpeg;base64,${base64}`);
      toast.success("Photo selected — tap Save to upload");
    } catch {
      toast.error("Failed to process image");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelected(file);
    e.target.value = "";
  };

  const handleWebcamCapture = (base64: string) => {
    setPendingImageBase64(base64);
    setShopImage(`data:image/jpeg;base64,${base64}`);
    toast.success("Photo captured — tap Save to upload");
  };

  const handleCameraClick = () => {
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      cameraInputRef.current?.click();
    } else {
      setWebcamOpen(true);
    }
  };

  const handleSave = () => {
    // TODO: POST to PHP backend (include pendingImageBase64 as SelectImage)
    toast.success("Company profile saved!");
  };

  const handleDelete = () => {
    toast.error("Shop deletion will be implemented with PHP backend");
  };

  const inputClass =
    "border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary text-center";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hidden file inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <WebcamCapture open={webcamOpen} onOpenChange={setWebcamOpen} onCapture={handleWebcamCapture} />

      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-primary">
        <button onClick={() => navigate("/profile")} className="text-primary-foreground">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">
          Company Profile
        </h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-8">
        {/* Shop Image */}
        <div className="w-full h-48 bg-muted flex items-center justify-center overflow-hidden">
          {shopImage ? (
            <img src={shopImage} alt="Shop" className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl">🏪</span>
          )}
        </div>

        {/* Camera / Gallery / Save buttons */}
        <div className="flex justify-center gap-3 py-4">
          <Button variant="secondary" className="rounded-full px-5 gap-2" size="sm" onClick={() => cameraInputRef.current?.click()}>
            <Camera size={14} />
            Camera
          </Button>
          <Button variant="secondary" className="rounded-full px-5 gap-2" size="sm" onClick={() => galleryInputRef.current?.click()}>
            <ImageIcon size={14} />
            Gallery
          </Button>
          <Button variant="secondary" className="rounded-full px-5 gap-2" size="sm" onClick={handleSave}>
            <Save size={14} />
            Save
          </Button>
        </div>

        <h2 className="text-lg font-bold text-foreground text-center mb-4 font-heading">
          Edit Company Profile
        </h2>

        {/* Form fields */}
        <div className="px-6 space-y-5">
          <Input
            value={form.shopName}
            onChange={(e) => handleChange("shopName", e.target.value)}
            placeholder="Shop Name"
            className={inputClass}
          />
          <Input
            value={form.mobileNumber}
            onChange={(e) => handleChange("mobileNumber", e.target.value)}
            placeholder="Mobile Number"
            className={inputClass}
          />
          <Input
            type="email"
            value={form.companyEmail}
            onChange={(e) => handleChange("companyEmail", e.target.value)}
            placeholder="Company Email"
            className={inputClass}
          />
          <Input
            value={form.lineOne}
            onChange={(e) => handleChange("lineOne", e.target.value)}
            placeholder="1st line Address"
            className={inputClass}
          />
          <Input
            value={form.lineTwo}
            onChange={(e) => handleChange("lineTwo", e.target.value)}
            placeholder="2nd line Address"
            className={inputClass}
          />
          <Input
            value={form.lineThree}
            onChange={(e) => handleChange("lineThree", e.target.value)}
            placeholder="3rd line Address"
            className={inputClass}
          />
          <Input
            value={form.lineFour}
            onChange={(e) => handleChange("lineFour", e.target.value)}
            placeholder="4th line Address"
            className={inputClass}
          />
          <Input
            value={form.country}
            onChange={(e) => handleChange("country", e.target.value)}
            placeholder="Country"
            className={inputClass}
          />

          {/* Opening / Closing times */}
          <Input
            type="time"
            value={form.openTime}
            onChange={(e) => handleChange("openTime", e.target.value)}
            className={inputClass}
          />
          <Input
            type="time"
            value={form.closeTime}
            onChange={(e) => handleChange("closeTime", e.target.value)}
            className={inputClass}
          />

          {/* Notification count */}
          <Input
            type="number"
            value={form.notificationCount}
            onChange={(e) => handleChange("notificationCount", e.target.value)}
            className={inputClass}
          />
          <Input
            value={form.notifications}
            onChange={(e) => handleChange("notifications", e.target.value)}
            placeholder="Notifications"
            className={inputClass}
          />

          {/* Toggles */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Your Live to receive Orders</span>
              <Switch
                checked={toggles.liveOrders}
                onCheckedChange={(v) => handleToggle("liveOrders", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Takeaways is Enabled</span>
              <Switch
                checked={toggles.takeaways}
                onCheckedChange={(v) => handleToggle("takeaways", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Deliveries are Enabled</span>
              <Switch
                checked={toggles.deliveries}
                onCheckedChange={(v) => handleToggle("deliveries", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Enable to Allow Global</span>
              <Switch
                checked={toggles.allowGlobal}
                onCheckedChange={(v) => handleToggle("allowGlobal", v)}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-4">
            <Button variant="secondary" className="w-full rounded-md">
              QR Code Generator
            </Button>
            <Button variant="outline" className="w-full rounded-md" onClick={() => setMarkerPickerOpen(true)}>
              Choose a Map Marker
            </Button>
          </div>

          {/* Map marker preview */}
          <div className="flex flex-col items-center py-4">
            <span className="text-6xl">{selectedMarker.emoji}</span>
            <span className="text-xs font-bold text-muted-foreground mt-1">{selectedMarker.label}</span>
          </div>

          <MapMarkerPicker
            open={markerPickerOpen}
            onOpenChange={setMarkerPickerOpen}
            selected={selectedMarker.emoji}
            onSelect={(emoji, label) => setSelectedMarker({ emoji, label })}
          />

          {/* Update GPS */}
          <Button variant="secondary" className="w-full rounded-md">
            Update GPS
          </Button>

          {/* Description */}
          <Input
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Shop description"
            className={inputClass}
          />

          {/* Delete */}
          <Button
            variant="destructive"
            className="w-full rounded-md font-bold uppercase"
            onClick={handleDelete}
          >
            <Trash2 size={16} className="mr-2" />
            Delete Your Shop
          </Button>

          {/* Bottom actions */}
          <div className="flex gap-3 pb-4">
            <Button variant="outline" className="flex-1 rounded-md">
              Add Products
            </Button>
            <Button variant="outline" className="flex-1 rounded-md" onClick={() => navigate("/orders")}>
              View Orders
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;
