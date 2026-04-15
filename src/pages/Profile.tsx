import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, User, Camera, Image, Save, Trash2, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type DigitalPerson, updateUserProfile } from "@/lib/api";
import { loadCompanyProfile } from "@/lib/companyApi";
import { toast } from "sonner";
import WebcamCapture from "@/components/WebcamCapture";
import { useLanguage } from "@/contexts/LanguageContext";
import AdvertSlot from "@/components/adverts/AdvertSlot";
import VideoAdvert from "@/components/adverts/VideoAdvert";
import { useAdverts } from "@/hooks/useAdverts";

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
        const base64 = dataUrl.split(",")[1];
        resolve(base64);
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showVideoAd, dismissVideoAd, videoAdvert, videoVisible } = useAdverts();
  const [user, setUser] = useState<DigitalPerson | null>(null);
  const [form, setForm] = useState({
    name: "", surname: "", gender: "", mobileNumber: "",
    lineOne: "", lineTwo: "", lineThree: "", lineFour: "",
    country: "", deliveryNotes: "",
  });
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("digitalUser");
    if (stored) {
      const parsed = JSON.parse(stored) as DigitalPerson;
      setUser(parsed);
      setForm({
        name: (parsed.name || parsed.Name || "") as string,
        surname: (parsed.surname || parsed.Surname || "") as string,
        gender: ((parsed as any).DateofBirth || (parsed as any).Gender || "") as string,
        mobileNumber: (parsed.MobileNumber || "") as string,
        lineOne: ((parsed as any).LineOneAddress || "") as string,
        lineTwo: ((parsed as any).LineTwoAddress || "") as string,
        lineThree: ((parsed as any).LineThreeAddress || "") as string,
        lineFour: ((parsed as any).LineFourAddress || "") as string,
        country: ((parsed as any).LineCountryAddress || "") as string,
        deliveryNotes: ((parsed as any).LineDeliveryNotesAddress || (parsed as any).DeliveryNotes || "") as string,
      });
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelected = async (file: File) => {
    try {
      const base64 = await resizeAndConvertToBase64(file);
      setPendingImageBase64(base64);
      setPreviewUrl(`data:image/jpeg;base64,${base64}`);
      toast.success(t("SaveSuccessful"));
    } catch {
      toast.error(t("SaveFailed"));
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelected(file);
    e.target.value = "";
  };

  const handleWebcamCapture = (base64: string) => {
    setPendingImageBase64(base64);
    setPreviewUrl(`data:image/jpeg;base64,${base64}`);
    toast.success(t("SaveSuccessful"));
  };

  const handleCameraClick = () => {
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      cameraInputRef.current?.click();
    } else {
      setWebcamOpen(true);
    }
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const updatedUser: DigitalPerson = {
      ...user,
      Name: form.name, name: form.name,
      Surname: form.surname, surname: form.surname,
      MobileNumber: form.mobileNumber,
      DateofBirth: form.gender,
      LineOneAddress: form.lineOne, LineTwoAddress: form.lineTwo,
      LineThreeAddress: form.lineThree, LineFourAddress: form.lineFour,
      LineCountryAddress: form.country, LineDeliveryNotesAddress: form.deliveryNotes,
    } as any;

    const result = await updateUserProfile(updatedUser, pendingImageBase64 || undefined);
    setSaving(false);

    if (result.success && result.data) {
      const merged = { ...user, ...result.data };
      localStorage.setItem("digitalUser", JSON.stringify(merged));
      setUser(merged);
      setPendingImageBase64(null);
      setPreviewUrl(null);
      toast.success(t("SaveSuccessful"));
    } else {
      toast.error(result.error || t("SaveFailed"));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("digitalUser");
    toast.success(t("Signin"));
    navigate("/");
  };

  const handleDeleteProfile = () => {
    if (window.confirm(t("Areyousureyouwanttodeleteyouruserprofileandallitscontents"))) {
      localStorage.removeItem("digitalUser");
      toast.success(t("Delete"));
      navigate("/");
    }
  };

  if (!user) return null;

  const imagePath = (() => {
    if (previewUrl) return previewUrl;
    const raw = user.Imagepath as string | undefined;
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const base = "https://app.techguygeek.co.uk";
    const cleaned = raw.replace(/^\/+/, "");
    const fullPath = cleaned.startsWith("menu1/") ? cleaned : `menu1/${cleaned}`;
    return `${base}/${fullPath}`;
  })();

  return (
    <div className="min-h-screen bg-background">
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <WebcamCapture open={webcamOpen} onOpenChange={setWebcamOpen} onCapture={handleWebcamCapture} />

      <div className="relative w-full max-w-lg mx-auto pt-6 px-4">
        <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-card border border-border mb-4">
          {imagePath ? (
            <img src={imagePath} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={64} className="text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3 mb-6">
          <Button size="sm" className="rounded-full px-5" onClick={handleCameraClick}>
            <Camera size={14} className="mr-1.5" />
            {t("Camera")}
          </Button>
          <Button size="sm" className="rounded-full px-5" onClick={() => galleryInputRef.current?.click()}>
            <Image size={14} className="mr-1.5" />
            {t("Gallery")}
          </Button>
          <Button size="sm" className="rounded-full px-5" onClick={handleSave} disabled={saving}>
            <Save size={14} className="mr-1.5" />
            {saving ? t("Pleasewait") : t("Save")}
          </Button>
        </div>

        <h1 className="text-lg font-bold text-foreground font-heading text-center mb-6">
          {t("UserProfilePageTitle")}
        </h1>

        <div className="space-y-4 mb-8">
          <ProfileField label={t("Name")} value={form.name} onChange={(v) => handleChange("name", v)} />
          <ProfileField label={t("LastName")} value={form.surname} onChange={(v) => handleChange("surname", v)} />
          <div className="text-center">
            <Select value={form.gender} onValueChange={(v) => handleChange("gender", v)}>
              <SelectTrigger className="w-full border-0 border-b border-border rounded-none bg-transparent text-center text-base font-medium text-foreground shadow-none focus:ring-0">
                <SelectValue placeholder={t("Gender")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">{t("Male")}</SelectItem>
                <SelectItem value="Female">{t("Female")}</SelectItem>
                <SelectItem value="Non-binary">Non-binary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ProfileField label={t("Mobile")} value={form.mobileNumber} onChange={(v) => handleChange("mobileNumber", v)} />
          <ProfileField label={t("1stlineAddress")} value={form.lineOne} onChange={(v) => handleChange("lineOne", v)} />
          <ProfileField label={t("2ndlineAddress")} value={form.lineTwo} onChange={(v) => handleChange("lineTwo", v)} />
          <ProfileField label={t("3rdlineAddress")} value={form.lineThree} onChange={(v) => handleChange("lineThree", v)} />
          <ProfileField label={t("4thLineAddress")} value={form.lineFour} onChange={(v) => handleChange("lineFour", v)} />
          <ProfileField label={t("Country")} value={form.country} onChange={(v) => handleChange("country", v)} />
          <ProfileField label={t("DeliveryNotes")} value={form.deliveryNotes} onChange={(v) => handleChange("deliveryNotes", v)} />
        </div>

        <Button
          variant="destructive"
          className="w-full mb-4 rounded-full font-semibold"
          onClick={handleDeleteProfile}
        >
          <Trash2 size={16} className="mr-2" />
          {t("DELETEYOURPROFILE")}
        </Button>

        <div className="flex gap-2 mb-6">
          <Button
            variant="secondary"
            className="flex-1 rounded-full text-sm"
            disabled={!user}
            onClick={async (e) => {
              const btn = e.currentTarget;
              if (btn.dataset.loading === "true") return;
              btn.dataset.loading = "true";
              if (!user) return;
              toast.loading(t("Pleasewait"), { id: "shop-check" });
              try {
                const personId = String(user.PersonID || user.ID || "");
                const email = (user.Email || user.email || "") as string;
                const company = await loadCompanyProfile(personId, email);
                toast.dismiss("shop-check");
                if (company && Number(company.companyid) > 0) {
                  navigate("/company-profile", { state: { company } });
                } else {
                  navigate("/build-shop");
                }
              } catch {
                toast.dismiss("shop-check");
                toast.error(t("Pleasecheckyourinternetconnection"));
              } finally {
                btn.dataset.loading = "false";
              }
            }}
          >
            {t("Build")}
          </Button>
          <Button variant="secondary" className="flex-1 rounded-full text-sm" onClick={() => navigate("/view-shops")}>
            {t("ViewShops")}
          </Button>
          <Button variant="secondary" className="flex-1 rounded-full text-sm" onClick={() => navigate("/orders")}>
            {t("Orders")}
          </Button>
        </div>

        <Button variant="outline" className="w-full mb-8 rounded-full" onClick={handleLogout}>
          <LogOut size={16} className="mr-2" />
          {t("Signin")}
        </Button>
      </div>
    </div>
  );
};

const ProfileField = ({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) => (
  <div>
    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-heading mb-1 block">
      {label}
    </label>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
    />
  </div>
);

export default Profile;
