import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Image as ImageIcon, Save, Trash2, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegisterNavActions } from "@/contexts/SiteNavExtras";
import MapMarkerPicker, { type MapMarkerOption } from "@/components/MapMarkerPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import WebcamCapture from "@/components/WebcamCapture";
import {
  loadCompanyProfile, saveCompanyProfile, toggleOrderEnable, toggleTakeawayEnable,
  toggleDeliveryEnable, toggleGlobalEnable, updateCompanyGPS,
  getDeleteBlockers, deleteCompany, getCompanyImageUrl,
  getMarkerForPublicNumber, saveMapMarker, countMenuGroups, updatePaymentMethod,
  type CompanyProfile as CompanyProfileType
} from "@/lib/companyApi";
import { fetchOrderCountCombined } from "@/lib/companyOrders";
import type { DigitalPerson } from "@/lib/api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import QRCodeGenerator from "@/components/QRCodeGenerator";


const MAX_IMAGE_SIZE = 800;

function resizeAndConvertToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > MAX_IMAGE_SIZE || h > MAX_IMAGE_SIZE) {
          if (w > h) { h = Math.round(h * MAX_IMAGE_SIZE / w); w = MAX_IMAGE_SIZE; }
          else { w = Math.round(w * MAX_IMAGE_SIZE / h); h = MAX_IMAGE_SIZE; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8).split(",")[1]);
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface LabeledInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputClass: string;
  type?: string;
}

const LabeledInput = ({ label, value, onChange, inputClass, type = "text" }: LabeledInputProps) => (
  <div className="space-y-1">
    <label className="text-xs text-muted-foreground block">{label}</label>
    <Input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={label}
      className={inputClass}
    />
  </div>
);

const CompanyProfile = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<DigitalPerson | null>(null);
  const [company, setCompany] = useState<CompanyProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null);
  const [shopImage, setShopImage] = useState("");
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [markerPickerOpen, setMarkerPickerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBlockerMsg, setDeleteBlockerMsg] = useState("");
  const [addProductsLoading, setAddProductsLoading] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    shopName: "", mobileNumber: "", companyEmail: "",
    lineOne: "", lineTwo: "", lineThree: "", lineFour: "", country: "",
    openTime: "06:00", closeTime: "23:00",
    notificationCount: "24", notifications: "",
    description: "",
  });

  const [toggles, setToggles] = useState({
    liveOrders: true, takeaways: true, deliveries: true, allowGlobal: false,
  });

  const [publicNumber, setPublicNumber] = useState(0);
  const [selectedMarker, setSelectedMarker] = useState({ emoji: "🧸", label: "TOYS ICON" });

  // Payment method: "0" cash only, "1" card only, "2" cash and card
  const [paymentMethod, setPaymentMethod] = useState<string>("0");
  const [stripeEnabled, setStripeEnabled] = useState<boolean>(false);

  // Load user & company
  useEffect(() => {
    const stored = localStorage.getItem("digitalUser");
    if (!stored) { navigate("/"); return; }
    const u = JSON.parse(stored) as DigitalPerson;
    setUser(u);

    const personId = String(u.PersonID || u.ID || "");
    const email = (u.Email || u.email || "") as string;

    loadCompanyProfile(personId, email).then(c => {
      if (c) {
        setCompany(c);
        setForm({
          shopName: c.CompanyName || c.companyname || "",
          mobileNumber: c.CompanyMobile || "",
          companyEmail: c.CompanyEmail || "",
          openTime: c.OpeningTimes || "06:00",
          closeTime: c.ClosingTimes || "23:00",
          notificationCount: c.TableNumbers || "24",
          notifications: c.MenuNotifications || "",
          lineOne: c.LineOneAddress || "",
          lineTwo: c.LineTwoAddress || "",
          lineThree: c.LineThreeAddress || "",
          lineFour: c.LineFourAddress || "",
          country: c.LineCountryAddress || "",
          description: c.CompanyDescription || "",
        });
        setToggles({
          liveOrders: c.OrderEnable === "1",
          takeaways: c.TakeawayEnable === "1",
          deliveries: c.DeliveryEnable === "1",
          allowGlobal: c.PayOnPhoneEnable === "1",
        });
        setPublicNumber(Number(c.PublicNumber) || 0);
        const marker = getMarkerForPublicNumber(c.PublicNumber);
        setSelectedMarker({ emoji: marker.emoji, label: marker.label.toUpperCase() + " ICON" });
        const pm = String((c as Record<string, unknown>).PaymentMethod ?? "0");
        setPaymentMethod(["0", "1", "2"].includes(pm) ? pm : "0");
        setStripeEnabled(String((c as Record<string, unknown>).StripeEnabled ?? "0") === "1");
        const imgUrl = getCompanyImageUrl(c.companyphoto);
        if (imgUrl) setShopImage(imgUrl);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [navigate]);

  const getUserAuth = useCallback(() => {
    if (!user || !company) return null;
    return {
      userId: Number(user.PersonID || user.ID || 0),
      email: (user.Email || user.email || "") as string,
      password: (user.Password || user.password || user.Token || "") as string,
    };
  }, [user, company]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Image handling
  const handleImageSelected = async (file: File) => {
    try {
      const base64 = await resizeAndConvertToBase64(file);
      setPendingImageBase64(base64);
      setShopImage(`data:image/jpeg;base64,${base64}`);
      toast.success("Photo selected — tap Save to upload");
    } catch { toast.error("Failed to process image"); }
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

  // Save
  const handleSave = async () => {
    if (!company || !user || saving) return;
    setSaving(true);
    const auth = getUserAuth()!;
    const payload = {
      companyid: company.companyid,
      PersonID: auth.userId,
      Email: auth.email,
      Password: auth.password,
      companyname: form.shopName,
      Imagepath: company.Imagepath || "",
      companyphoto: company.companyphoto || "",
      companylat: company.companylat || 0,
      companylong: company.companylong || 0,
      snippet: company.snippet || "",
      companyPhotoBackGround: company.companyPhotoBackGround || "",
      CompanyMobile: form.mobileNumber,
      CompanyEmail: form.companyEmail,
      companypath: "",
      Switchischecked: "",
      OpeningTimes: form.openTime,
      ClosingTimes: form.closeTime,
      TableNumbers: form.notificationCount,
      MenuNotifications: form.notifications,
      PictureBlob: pendingImageBase64 || "0",
      OrderEnable: toggles.liveOrders ? "1" : "0",
      TakeawayEnable: toggles.takeaways ? "1" : "0",
      DeliveryEnable: toggles.deliveries ? "1" : "0",
      PayOnPhoneEnable: toggles.allowGlobal ? "1" : "0",
      PublicNumber: String(publicNumber),
      PrivateNumber: company.PrivateNumber || "",
      LineOneAddress: form.lineOne,
      LineTwoAddress: form.lineTwo,
      LineThreeAddress: form.lineThree,
      LineFourAddress: form.lineFour,
      LineCountryAddress: form.country,
      CompanyDescription: form.description,
      LastLoggedOn: "",
    };

    const result = await saveCompanyProfile(payload);
    setSaving(false);
    if (result.success) {
      setPendingImageBase64(null);
      toast.success("Company profile saved!");
    } else {
      toast.error(result.error || "Save failed");
    }
  };

  // Toggle handlers
  const handleToggle = async (field: string, value: boolean) => {
    setToggles(prev => ({ ...prev, [field]: value }));
    const auth = getUserAuth();
    if (!auth || !company) return;

    let ok = true;
    if (field === "liveOrders") {
      ok = await toggleOrderEnable(company.companyid, value ? "1" : "0", auth.userId, auth.email, auth.password);
    } else if (field === "takeaways") {
      ok = await toggleTakeawayEnable(company.companyid, value ? "1" : "0", auth.userId, auth.email, auth.password);
    } else if (field === "deliveries") {
      ok = await toggleDeliveryEnable(company.companyid, value ? "1" : "0", auth.userId, auth.email, auth.password);
    } else if (field === "allowGlobal") {
      const rawPaid = user?.PaidUser ?? user?.Paiduser ?? (user as Record<string, unknown>)?.paidUser;
      const isPaid = rawPaid === 2 || rawPaid === "2" || rawPaid === 1 || rawPaid === "1" || rawPaid === true;
      console.log("[GlobalGuard] user object:", JSON.stringify(user));
      console.log("[GlobalGuard] rawPaid value:", rawPaid, "typeof:", typeof rawPaid);
      console.log("[GlobalGuard] isPaid:", isPaid);
      if (value && !isPaid) {
        console.log("[GlobalGuard] BLOCKED - user is not paid");
        setToggles(prev => ({ ...prev, allowGlobal: false }));
        toast.error("You need the paid version to make your Digital Shop Global. Please upgrade.");
        return;
      }
      console.log("[GlobalGuard] ALLOWED - proceeding with save");
      ok = await toggleGlobalEnable(company.companyid, value ? "1" : "0", auth.userId, auth.email, auth.password);
    }
    if (!ok) {
      setToggles(prev => ({ ...prev, [field]: !value }));
      toast.error("Failed to update toggle");
    }
  };

  // Update GPS
  const handleUpdateGPS = async () => {
    if (String(user?.PaidUser ?? user?.Paiduser) !== "2") {
      toast.error("Only pro members can update GPS");
      return;
    }
    if (!company || !navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const confirm = window.confirm(
        `Update GPS?\n\nOld: ${company.companylat || 0}, ${company.companylong || 0}\nNew: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      );
      if (!confirm) return;
      const auth = getUserAuth()!;
      const ok = await updateCompanyGPS(company.companyid, latitude, longitude, auth.userId, auth.email, auth.password);
      if (ok) toast.success("GPS updated!");
      else toast.error("Failed to update GPS");
    }, () => toast.error("Could not get location"));
  };

  // Add Products — mirrors MAUI: save profile, check group count, branch
  const handleAddProducts = async () => {
    if (addProductsLoading) return;
    if (!company || !Number(company.companyid)) {
      toast.error("Please create a company first");
      return;
    }
    setAddProductsLoading(true);
    try {
      await handleSave();
      console.log("[handleAddProducts] Checking menu group count for companyid:", company.companyid);
      const countResult = await countMenuGroups(Number(company.companyid));
      console.log("[handleAddProducts] countMenuGroups result:", countResult);
      // MAUI logic: if "ZERO" or "0" or empty → first-time setup, else edit
      const hasGroups = countResult !== "ZERO" && countResult !== "0" && countResult.trim() !== "";
      if (hasGroups) {
        console.log("[handleAddProducts] Groups exist, navigating to edit-menu-groups");
        navigate(`/edit-menu-groups?companyId=${company.companyid}`);
      } else {
        console.log("[handleAddProducts] No groups, navigating to edit-menu-groups (add mode)");
        navigate(`/edit-menu-groups?companyId=${company.companyid}`);
      }
    } catch (err) {
      console.error("[handleAddProducts] Error:", err);
      toast.error("Unable to load menu groups. Please try again.");
    } finally {
      setAddProductsLoading(false);
    }
  };

  // View Orders
  const handleViewOrders = async () => {
    await handleSave();
    if (!company) return;

    if (company.companyid === 0) {
      toast.info("Please create a company first");
      return;
    }

    navigate("/company-orders", { state: { companyId: String(company.companyid) } });
  };

  // Delete
  const handleDeleteClick = async () => {
    if (!company) return;
    const blockers = await getDeleteBlockers(company.companyid);
    if (blockers.total > 0) {
      const msgs: string[] = [];
      if (blockers.menuGroups > 0) msgs.push(`${blockers.menuGroups} menu group(s)`);
      if (blockers.dayOrders > 0) msgs.push(`${blockers.dayOrders} day order(s)`);
      if (blockers.weekOrders > 0) msgs.push(`${blockers.weekOrders} week order(s)`);
      if (blockers.monthOrders > 0) msgs.push(`${blockers.monthOrders} month order(s)`);
      setDeleteBlockerMsg(`Please delete the following before removing your shop:\n• ${msgs.join("\n• ")}`);
    } else {
      setDeleteBlockerMsg("");
    }
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!company) return;
    const auth = getUserAuth()!;
    const result = await deleteCompany(company.companyid, auth.userId, auth.email, auth.password);
    setDeleteDialogOpen(false);
    if (result.success) {
      localStorage.removeItem("hasShop");
      toast.success("Shop deleted successfully");
      navigate("/");
    } else {
      toast.error(result.message || "Delete failed");
    }
  };

  useRegisterNavActions(
    "company-delete-shop",
    [
      {
        id: "payment-methods",
        label: t("MyPaymentMethods") || "My Payment Methods",
        onClick: () => navigate("/payment-methods"),
      },
      {
        id: "delete-shop",
        label: t("DELETEYOURSHOP") || "DELETE YOUR SHOP",
        variant: "destructive",
        onClick: handleDeleteClick,
        order: 100,
      },
    ],
    [t, navigate, company?.companyid],
  );

  const inputClass =
    "border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary text-center";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center gap-3 p-4 bg-primary">
          <button onClick={() => navigate("/profile")} className="text-primary-foreground"><ArrowLeft size={24} /></button>
          <h1 className="text-lg font-bold text-primary-foreground font-heading">{t("CompanyProfile")}</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-muted-foreground text-lg mb-4">{t("Pleasecreateacompanyfirst")}</p>
            <Button onClick={() => navigate("/build-shop")}>{t("Build")}</Button>
          </div>
        </div>
      </div>
    );
  }

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
        <h1 className="text-lg font-bold text-primary-foreground font-heading">{t("CompanyProfile")}</h1>
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
          <Button variant="secondary" className="rounded-full px-5 gap-2" size="sm" onClick={handleCameraClick}>
            <Camera size={14} /> {t("Camera")}
          </Button>
          <Button variant="secondary" className="rounded-full px-5 gap-2" size="sm" onClick={() => galleryInputRef.current?.click()}>
            <ImageIcon size={14} /> {t("Gallery")}
          </Button>
          <Button variant="secondary" className="rounded-full px-5 gap-2" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            {t("Save")}
          </Button>
        </div>

        <h2 className="text-lg font-bold text-foreground text-center mb-4 font-heading">
          {t("CompanyProfilePageTitle")}
        </h2>

        {/* Form fields */}
        <div className="px-6 space-y-3">
          <LabeledInput label={t("CompanyName")} value={form.shopName} onChange={v => handleChange("shopName", v)} inputClass={inputClass} />
          <LabeledInput label={t("Mobile")} value={form.mobileNumber} onChange={v => handleChange("mobileNumber", v)} inputClass={inputClass} />
          <LabeledInput label={t("CompanyEmail")} type="email" value={form.companyEmail} onChange={v => handleChange("companyEmail", v)} inputClass={inputClass} />
          <LabeledInput label={t("1stlineAddress")} value={form.lineOne} onChange={v => handleChange("lineOne", v)} inputClass={inputClass} />
          <LabeledInput label={t("2ndlineAddress")} value={form.lineTwo} onChange={v => handleChange("lineTwo", v)} inputClass={inputClass} />
          <LabeledInput label={t("3rdlineAddress")} value={form.lineThree} onChange={v => handleChange("lineThree", v)} inputClass={inputClass} />
          <LabeledInput label={t("4thLineAddress")} value={form.lineFour} onChange={v => handleChange("lineFour", v)} inputClass={inputClass} />
          <LabeledInput label={t("Country")} value={form.country} onChange={v => handleChange("country", v)} inputClass={inputClass} />

          {/* Opening / Closing times */}
          <LabeledInput label={t("OpeningTimes")} type="time" value={form.openTime} onChange={v => handleChange("openTime", v)} inputClass={inputClass} />
          <LabeledInput label={t("ClosingTimes")} type="time" value={form.closeTime} onChange={v => handleChange("closeTime", v)} inputClass={inputClass} />

          {/* Notification count & notifications */}
          <LabeledInput label={t("TableNumber")} type="number" value={form.notificationCount} onChange={v => handleChange("notificationCount", v)} inputClass={inputClass} />
          <LabeledInput label={t("EnableNotifications")} value={form.notifications} onChange={v => handleChange("notifications", v)} inputClass={inputClass} />

          {/* Toggles */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{toggles.liveOrders ? t("YourLivetorecieveOrders") : t("EnabletoRecieveOrders")}</span>
              <Switch checked={toggles.liveOrders} onCheckedChange={v => handleToggle("liveOrders", v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground"><span className="text-sm text-foreground">{toggles.takeaways ? t("TakewaysisEnabled") : t("EnabletoAllowTakeaways")}</span></span>
              <Switch checked={toggles.takeaways} onCheckedChange={v => handleToggle("takeaways", v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{toggles.deliveries ? t("DeliveriesareEnabled") : t("EnabletoAllowDeliveries")}</span>
              <Switch checked={toggles.deliveries} onCheckedChange={v => handleToggle("deliveries", v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{toggles.allowGlobal ? t("GlobalEnabled") : t("EnableToAllowGlobal")}</span>
              <Switch checked={toggles.allowGlobal} onCheckedChange={v => handleToggle("allowGlobal", v)} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-4">
            <Button variant="secondary" className="w-full rounded-md" onClick={() => {
              console.log("[QR] Opening QR generator for company:", company);
              setQrOpen(true);
            }}>
              {t("BarcodeGenerator")}
            </Button>
            <Button variant="outline" className="w-full rounded-md" onClick={() => setMarkerPickerOpen(true)}>
              {t("ChooseaMapMarker")}
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
            selectedId={publicNumber}
            onSelect={async (marker: MapMarkerOption) => {
              console.log("[MapMarker] Selected:", marker);
              setSelectedMarker({ emoji: marker.emoji, label: marker.label });
              setPublicNumber(marker.id);
              setMarkerPickerOpen(false);

              const auth = getUserAuth();
              if (!auth || !company) {
                toast.error("Cannot save marker — missing auth or company data");
                return;
              }

              const ok = await saveMapMarker(company.companyid, marker.id, auth.userId, auth.email, auth.password);
              if (ok) {
                toast.success(t("DetailswereSaved"));
                // Refresh company data
                const personId = String(user?.PersonID || user?.ID || "");
                const email = (user?.Email || user?.email || "") as string;
                const refreshed = await loadCompanyProfile(personId, email);
                if (refreshed) setCompany(refreshed);
              } else {
                toast.error(t("DetaileswerenotSaved"));
              }
            }}
          />

          {/* Update GPS */}
          <Button variant="secondary" className="w-full rounded-md" onClick={handleUpdateGPS}>
            {t("UpdateGPS")}
          </Button>

          {/* Description */}
          <Input value={form.description} onChange={e => handleChange("description", e.target.value)} placeholder={t("CompanyDescription")} className={inputClass} />

          {/* Bottom actions */}
          <div className="flex gap-3 pb-4">
            <Button variant="outline" className="flex-1 rounded-md" onClick={handleAddProducts} disabled={addProductsLoading}>
              {addProductsLoading ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
              {t("AddProducts")}
            </Button>
            <Button variant="outline" className="flex-1 rounded-md" onClick={handleViewOrders}>
              {t("Orders")}
            </Button>
          </div>
        </div>
      </div>


      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteBlockerMsg ? t("DELETEYOURSHOP") : t("Areyousureyouwanttodeleteyourshopandallitscontents")}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {deleteBlockerMsg || t("Areyousureyouwanttodeleteyourshopandallitscontents")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            {!deleteBlockerMsg && (
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t("Delete")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {company && (
        <QRCodeGenerator
          open={qrOpen}
          onOpenChange={setQrOpen}
          companyId={company.companyid}
          companyName={form.shopName || company.companyname || "Shop"}
        />
      )}
    </div>
  );
};

export default CompanyProfile;
