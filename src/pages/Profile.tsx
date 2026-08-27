import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, User, Camera, Image, Save, Trash2, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMenuImageUrl, getProfileDeletionStatus } from "@/lib/authClient";
import type { AuthUser, ProfileUpdate } from "@/lib/authClient";
import { useAuth } from "@/contexts/AuthContext";
import { getOwnedCompany } from "@/lib/companyApi";
import { toast } from "sonner";
import WebcamCapture from "@/components/WebcamCapture";
import { useLanguage } from "@/contexts/LanguageContext";
import ProfileHelpAssistant from "@/components/ProfileHelpAssistant";
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

type ProfileForm = {
  name: string;
  surname: string;
  gender: string;
  mobileNumber: string;
  lineOne: string;
  lineTwo: string;
  lineThree: string;
  lineFour: string;
  country: string;
  deliveryNotes: string;
};

function profileFormFromUser(user: AuthUser): ProfileForm {
  return {
    name: user.first_name || "",
    surname: user.last_name || "",
    gender: user.gender || "",
    mobileNumber: user.mobile_number || "",
    lineOne: user.line_one_address || "",
    lineTwo: user.line_two_address || "",
    lineThree: user.line_three_address || "",
    lineFour: user.line_four_address || "",
    country: user.line_country_address || "",
    deliveryNotes: user.delivery_notes || "",
  };
}

function profileImageUpdateFromUser(user: AuthUser, imageBase64: string): ProfileUpdate {
  return {
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    gender: user.gender || "",
    mobile_number: user.mobile_number || "",
    line_one_address: user.line_one_address || "",
    line_two_address: user.line_two_address || "",
    line_three_address: user.line_three_address || "",
    line_four_address: user.line_four_address || "",
    line_country_address: user.line_country_address || "",
    delivery_notes: user.delivery_notes || "",
    image_base64: imageBase64,
  };
}

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
  const { user, status, logout, deleteProfile, refreshProfile, saveProfile } = useAuth();
  const { t } = useLanguage();
  const { showVideoAd, dismissVideoAd, videoAdvert, videoVisible } = useAdverts();
  const [form, setForm] = useState<ProfileForm>({
    name: "", surname: "", gender: "", mobileNumber: "",
    lineOne: "", lineTwo: "", lineThree: "", lineFour: "",
    country: "", deliveryNotes: "",
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [imageSaving, setImageSaving] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const profileRequestedRef = useRef(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && !profileRequestedRef.current) {
      profileRequestedRef.current = true;
      refreshProfile().catch(() => navigate("/", { replace: true }));
    } else if (status === "anonymous") navigate("/", { replace: true });
  }, [navigate, refreshProfile, status]);

  useEffect(() => {
    if (user && !formDirty) setForm(profileFormFromUser(user));
  }, [formDirty, user]);

  const handleChange = (field: string, value: string) => {
    setFormDirty(true);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const persistImage = async (base64: string) => {
    if (!user || imageSaving) return;
    setImageSaving(true);
    setPreviewUrl(`data:image/jpeg;base64,${base64}`);
    try {
      await saveProfile(profileImageUpdateFromUser(user, base64));
      await refreshProfile();
      setPreviewUrl(null);
      toast.success(t("SaveSuccessful"));
    } catch {
      setPreviewUrl(null);
      toast.error(t("SaveFailed"));
    } finally {
      setImageSaving(false);
    }
  };

  const handleImageSelected = async (file: File) => {
    try {
      await persistImage(await resizeAndConvertToBase64(file));
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
    void persistImage(base64);
  };

  const handleCameraClick = () => {
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      cameraInputRef.current?.click();
    } else {
      setWebcamOpen(true);
    }
  };

  const [saving, setSaving] = useState(false);
  const isPaidUser = (() => {
    const u = user as unknown as Record<string, unknown> | null;
    if (!u) return false;
    return String(u.PaidUser ?? u.Paiduser ?? u.paid_user) === "2";
  })();

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      await saveProfile({
        first_name: form.name,
        last_name: form.surname,
        mobile_number: form.mobileNumber,
        gender: form.gender,
        line_one_address: form.lineOne,
        line_two_address: form.lineTwo,
        line_three_address: form.lineThree,
        line_four_address: form.lineFour,
        line_country_address: form.country,
        delivery_notes: form.deliveryNotes,
      });
      setFormDirty(false);
      setPreviewUrl(null);
      toast.success(t("SaveSuccessful"));
    } catch (error) {
      console.error(error);
      toast.error(t("SaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success(t("Signin"));
    navigate("/", { replace: true });
  };

  const handleDeleteProfile = async () => {
    if (!user) return;
    toast.loading(t("Pleasewait"), { id: "delete-profile" });
    try {
      const status = await getProfileDeletionStatus();
      toast.dismiss("delete-profile");
      if (status.safe_to_delete !== true || status.owns_company || status.outstanding_order_count > 0) {
        const blockers = [
          status.owns_company ? "Delete your shop before deleting your profile." : "",
          status.outstanding_order_count > 0 ? "Outstanding unpaid orders must be resolved first." : "",
        ].filter(Boolean).join(" ");
        toast.error(blockers || "Profile deletion is currently blocked.");
        return;
      }
      setConfirmDeleteOpen(true);
    } catch (err) {
      console.error("[deleteProfile] status exception:", err);
      toast.dismiss("delete-profile");
      toast.error(t("Pleasecheckyourinternetconnection"));
    }
  };

  const performDelete = async () => {
    if (!user) return;
    try {
      await deleteProfile();
      setConfirmDeleteOpen(false);
      toast.success(t("Delete"));
      navigate("/", { replace: true });
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
    const raw = user.image_path;
    if (!raw) return null;
    return getMenuImageUrl(raw, user.id);
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
          <Button size="sm" className="rounded-full px-5" onClick={handleCameraClick} disabled={imageSaving}>
            <Camera size={14} className="mr-1.5" />
            {t("Camera")}
          </Button>
          <Button size="sm" className="rounded-full px-5" onClick={() => galleryInputRef.current?.click()} disabled={imageSaving}>
            <Image size={14} className="mr-1.5" />
            {t("Gallery")}
          </Button>
          <Button size="sm" className="rounded-full px-5" onClick={handleSave} disabled={saving || imageSaving}>
            <Save size={14} className="mr-1.5" />
            {saving ? t("Pleasewait") : t("Save")}
          </Button>
        </div>

        <h1 className="text-lg font-bold text-foreground font-heading text-center mb-6">
          {t("UserProfilePageTitle")}
        </h1>

        <div className="space-y-2 mb-6 text-center">
          <p className="text-sm font-medium text-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">{user.email_verified ? "Email verified" : "Email verification required"}</p>
          <p className="text-xs text-muted-foreground">{isPaidUser ? "Paid account" : "Free account"}</p>
        </div>

        {Object.values(form).some((v) => !String(v).trim()) && (
          <ProfileHelpAssistant />
        )}

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
                const company = await getOwnedCompany();
                toast.dismiss("shop-check");
                if (company && company.id > 0) {
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
