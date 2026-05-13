import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, User, Camera, Image, Save, Trash2, Loader2, Play, Sparkles } from "lucide-react";
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
import { useRegisterNavActions } from "@/contexts/SiteNavExtras";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const isPaidUser = (() => {
    const u = user as Record<string, unknown> | null;
    if (!u) return false;
    return String(u.PaidUser ?? u.Paiduser) === "2";
  })();

  const handleUpgradeToPro = async () => {
    const u = user as Record<string, unknown> | null;
    const personId = u?.PersonID ?? u?.personID ?? u?.personid ?? u?.PersonId;
    const userEmail = u?.Email ?? u?.email;
    if (!personId || !userEmail) {
      toast.error("Please log in first to upgrade to Pro.");
      return;
    }
    setUpgradeLoading(true);
    try {
      const body = new URLSearchParams();
      body.append("PersonID", String(personId));
      body.append("Email", String(userEmail));
      const res = await fetch(
        "https://web.gpsshops.com/menu1/PHPwrite/User/CreateStripeCheckoutSession.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        }
      );
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error(data?.ServerMessage || "Could not start checkout. Please try again.");
        setUpgradeLoading(false);
      }
    } catch (err) {
      console.error(err);
      toast.error(t("Pleasecheckyourinternetconnection"));
      setUpgradeLoading(false);
    }
  };

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

  const handleDeleteProfile = async () => {
    if (!user) return;

    const personId = String((user as any).PersonID || (user as any).ID || "");
    const userEmail = String((user as any).Email || (user as any).email || "");
    const userPassword = String((user as any).Password || (user as any).password || (user as any).hash || "");

    toast.loading(t("Pleasewait"), { id: "delete-profile" });

    try {
      // 1) Check whether user has a company
      const companyUrl = "https://web.gpsshops.com/menu1/PHPread/Company/DoesCompanyExistorNotSecure.php";
      const companyPayload = { PersonID: personId, UserEmail: userEmail };
      console.log("[deleteProfile] company check URL:", companyUrl);
      console.log("[deleteProfile] company check payload:", companyPayload);

      const companyRes = await fetch(companyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyPayload),
      });
      const companyText = await companyRes.text();
      console.log("[deleteProfile] raw company response:", companyText);

      let hasCompany = false;
      try {
        const parsed = JSON.parse(companyText);
        console.log("[deleteProfile] parsed company response:", parsed);
        if (parsed?.success === true && Array.isArray(parsed?.companies) && parsed.companies.length > 0) {
          const first = parsed.companies[0];
          if (Number(first?.companyid) > 0) hasCompany = true;
        }
      } catch (e) {
        console.error("[deleteProfile] company JSON parse failed:", e);
      }

      if (hasCompany) {
        toast.dismiss("delete-profile");
        toast.error("You must delete your shop before deleting your profile.");
        return;
      }

      // 2) Check orders paid status
      const ordersUrl = "https://web.gpsshops.com/menu1/PHPread/User/CheckUserOrdersPaidStatusSecure.php";
      const ordersForm = new URLSearchParams();
      ordersForm.append("UserID", personId);
      ordersForm.append("UserEmail", userEmail);
      console.log("[deleteProfile] orders check URL:", ordersUrl);
      console.log("[deleteProfile] orders check payload:", Object.fromEntries(ordersForm.entries()));

      const ordersRes = await fetch(ordersUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: ordersForm.toString(),
      });
      const ordersText = await ordersRes.text();
      console.log("[deleteProfile] raw orders response:", ordersText);

      let ordersOk = false;
      let hasOrders = false;
      let allOrdersPaid = true;
      let serverMessage = "";
      try {
        const parsedOrders = JSON.parse(ordersText);
        console.log("[deleteProfile] parsed orders response:", parsedOrders);
        ordersOk = parsedOrders?.success === true;
        hasOrders = parsedOrders?.HasOrders === true;
        allOrdersPaid = parsedOrders?.AllOrdersPaid === true;
        serverMessage = String(parsedOrders?.ServerMessage || "");
      } catch (e) {
        console.error("[deleteProfile] orders JSON parse failed:", e);
      }

      if (!ordersOk) {
        toast.dismiss("delete-profile");
        toast.error(serverMessage || t("Pleasecheckyourinternetconnection"));
        return;
      }

      if (hasOrders && !allOrdersPaid) {
        toast.dismiss("delete-profile");
        toast.error("You still have unpaid orders. Please settle them before deleting your profile.");
        return;
      }

      toast.dismiss("delete-profile");

      // 3) Open confirm dialog (actual delete in performDelete)
      setConfirmDeleteOpen(true);
    } catch (err) {
      console.error("[deleteProfile] exception:", err);
      toast.dismiss("delete-profile");
      toast.error(t("Pleasecheckyourinternetconnection"));
    }
  };

  const performDelete = async () => {
    if (!user) return;
    const personId = String((user as any).PersonID || (user as any).ID || "");
    const userEmail = String((user as any).Email || (user as any).email || "");
    const userPassword = String((user as any).Password || (user as any).password || (user as any).hash || "");
    try {
      const deleteUrl = "https://web.gpsshops.com/menu1/PHPwrite/User/DeleteUserSecure.php";
      const deleteForm = new URLSearchParams();
      deleteForm.append("UserID", personId);
      deleteForm.append("UserEmail", userEmail);
      deleteForm.append("UserPassword", userPassword);
      console.log("[deleteProfile] delete URL:", deleteUrl);
      console.log("[deleteProfile] delete payload:", Object.fromEntries(deleteForm.entries()));

      const deleteRes = await fetch(deleteUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: deleteForm.toString(),
      });
      const deleteText = await deleteRes.text();
      console.log("[deleteProfile] raw delete response:", deleteText);

      if (deleteText.toUpperCase().includes("TRUE")) {
        localStorage.removeItem("digitalUser");
        toast.success(t("Delete"));
        navigate("/");
      } else {
        toast.error(t("SaveFailed"));
      }
    } catch (err) {
      console.error("[deleteProfile] exception:", err);
      toast.error(t("Pleasecheckyourinternetconnection"));
    }
  };

  useRegisterNavActions(
    "profile-delete",
    [
      {
        id: "delete-profile",
        label: t("DELETEYOURPROFILE") || "DELETE YOUR PROFILE",
        variant: "destructive",
        onClick: handleDeleteProfile,
        order: 100,
      },
    ],
    [t, navigate],
  );

  if (!user) return null;

  const imagePath = (() => {
    if (previewUrl) return previewUrl;
    const raw = user.Imagepath as string | undefined;
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const base = "https://web.gpsshops.com";
    const cleaned = raw.replace(/^\/+/, "");
    const fullPath = cleaned.startsWith("menu1/") ? cleaned : `menu1/${cleaned}`;
    return `${base}/${fullPath}`;
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* Video advert overlay */}
      <VideoAdvert advert={videoAdvert} visible={videoVisible} onDismiss={dismissVideoAd} />

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <WebcamCapture open={webcamOpen} onOpenChange={setWebcamOpen} onCapture={handleWebcamCapture} />

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("DELETEYOURPROFILE") || "Delete your profile"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Areyousureyouwanttodeleteyouruserprofileandallitscontents") ||
                "Are you sure you want to delete your user profile and all its contents?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel") || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={performDelete}
            >
              {t("Delete") || "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Top banner advert slot */}
      <AdvertSlot position="topBanner" className="px-4 pt-4" />

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
                <SelectItem value="Non-binary">{t("NonBinary")}</SelectItem>
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

        {/* Demo: video advert trigger button */}
        <Button
          variant="outline"
          className="w-full rounded-full gap-2"
          onClick={() => showVideoAd("pageEnter")}
        >
          <Play size={14} />
          Demo Video Ad
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
