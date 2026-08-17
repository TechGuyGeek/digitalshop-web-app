import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Image as ImageIcon, Save, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegisterNavActions } from "@/contexts/SiteNavExtras";
import MapMarkerPicker, { type MapMarkerOption } from "@/components/MapMarkerPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import WebcamCapture from "@/components/WebcamCapture";
import {
  getOwnedCompany, updateOwnedCompany, deleteOwnedCompany, getCompanyImageUrl,
  getMarkerForPublicNumber, countMenuGroups, type CompanyV1
} from "@/lib/companyApi";
import { useAuth } from "@/contexts/AuthContext";
import { AuthApiError } from "@/lib/authClient";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import ProfileHelpAssistant from "@/components/ProfileHelpAssistant";


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
  const { user, status } = useAuth();
  const { t } = useLanguage();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [company, setCompany] = useState<CompanyV1 | null>(null);
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
  const [gpsDialogOpen, setGpsDialogOpen] = useState(false);
  const [pendingGps, setPendingGps] = useState<{ lat: number; lng: number } | null>(null);

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
  const [selectedMarker, setSelectedMarker] = useState({
    emoji: "🧸",
    label: "Toys",
    translationKey: "ToysIcon",
    iconUrl: "https://gpsshops.com/map-icons/toys07.png",
  });

  // Payment method: "0" cash only, "1" card only, "2" cash and card
  const [paymentMethod, setPaymentMethod] = useState<string>("0");
  const [stripeEnabled, setStripeEnabled] = useState<boolean>(false);

  // Load user & company
  useEffect(() => {
    if (status === "anonymous") { navigate("/"); return; }
    if (status !== "authenticated") return;
    getOwnedCompany().then(c => {
      if (c) {
        setCompany(c);
        setForm({
          shopName: c.name, mobileNumber: c.mobile_number, companyEmail: c.company_email,
          openTime: c.opening_time || "06:00", closeTime: c.closing_time || "23:00",
          notificationCount: c.table_numbers || "24", notifications: c.notifications_enabled ? "1" : "0",
          lineOne: c.line_one_address, lineTwo: c.line_two_address, lineThree: c.line_three_address,
          lineFour: c.line_four_address, country: c.country, description: c.description,
        });
        setToggles({
          liveOrders: c.orders_enabled, takeaways: c.takeaway_enabled,
          deliveries: c.delivery_enabled, allowGlobal: c.global_enabled,
        });
        setPublicNumber(c.map_marker);
        const marker = getMarkerForPublicNumber(String(c.map_marker));
        setSelectedMarker({
          emoji: marker.emoji,
          label: marker.label,
          translationKey: marker.translationKey,
          iconUrl: marker.iconUrl,
        });
        const pm = String(c.payment_method);
        setPaymentMethod(["0", "1", "2"].includes(pm) ? pm : "0");
        setStripeEnabled(c.stripe_enabled);
        const imgUrl = getCompanyImageUrl(c.image_path);
        if (imgUrl) setShopImage(imgUrl);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [navigate, status]);

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
    const payload = {
      name: form.shopName, mobile_number: form.mobileNumber, company_email: form.companyEmail,
      latitude: company.latitude, longitude: company.longitude,
      opening_time: form.openTime, closing_time: form.closeTime, table_numbers: form.notificationCount,
      notifications_enabled: form.notifications === "1", orders_enabled: toggles.liveOrders,
      takeaway_enabled: toggles.takeaways, delivery_enabled: toggles.deliveries, global_enabled: toggles.allowGlobal,
      map_marker: publicNumber, payment_method: Number(paymentMethod), line_one_address: form.lineOne,
      line_two_address: form.lineTwo, line_three_address: form.lineThree, line_four_address: form.lineFour,
      country: form.country, description: form.description,
      ...(pendingImageBase64 ? { image_base64: pendingImageBase64 } : {}),
    };

    try {
      const updated = await updateOwnedCompany(payload);
      setCompany(updated);
      setPendingImageBase64(null);
      toast.success("Company profile saved!");
    } catch (error) {
      toast.error(error instanceof AuthApiError ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Toggle handlers
  const handleToggle = async (field: string, value: boolean) => {
    setToggles(prev => ({ ...prev, [field]: value }));
    if (!company) return;

    let ok = true;
    if (field === "liveOrders") {
      ok = true;
    } else if (field === "takeaways") {
      ok = true;
    } else if (field === "deliveries") {
      ok = true;
    } else if (field === "allowGlobal") {
      const rawPaid = user?.paid_user;
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
      ok = true;
    }
    if (ok) {
      try { await updateOwnedCompany({ name: form.shopName, mobile_number: form.mobileNumber, company_email: form.companyEmail, latitude: company.latitude, longitude: company.longitude, opening_time: form.openTime, closing_time: form.closeTime, table_numbers: form.notificationCount, notifications_enabled: form.notifications === "1", orders_enabled: field === "liveOrders" ? value : toggles.liveOrders, takeaway_enabled: field === "takeaways" ? value : toggles.takeaways, delivery_enabled: field === "deliveries" ? value : toggles.deliveries, global_enabled: field === "allowGlobal" ? value : toggles.allowGlobal, map_marker: publicNumber, payment_method: Number(paymentMethod), line_one_address: form.lineOne, line_two_address: form.lineTwo, line_three_address: form.lineThree, line_four_address: form.lineFour, country: form.country, description: form.description }); }
      catch { ok = false; }
    }
    if (!ok) {
      setToggles(prev => ({ ...prev, [field]: !value }));
      toast.error("Failed to update toggle");
    }
  };

  // Payment method change
  const handlePaymentMethodChange = async (newValue: string) => {
    const previous = paymentMethod;
    if (newValue === previous) return;

    // Card-only or Cash+Card require Stripe connected
    if ((newValue === "1" || newValue === "2") && !stripeEnabled) {
      toast.error("Stripe needs to be connected before card payments can be enabled.");
      setPaymentMethod("0");
      return;
    }

    if (!company || !user) return;
    setPaymentMethod(newValue);
    setPaymentMethod(newValue);
    try {
      await updateOwnedCompany({ name: form.shopName, mobile_number: form.mobileNumber, company_email: form.companyEmail, latitude: company.latitude, longitude: company.longitude, opening_time: form.openTime, closing_time: form.closeTime, table_numbers: form.notificationCount, notifications_enabled: form.notifications === "1", orders_enabled: toggles.liveOrders, takeaway_enabled: toggles.takeaways, delivery_enabled: toggles.deliveries, global_enabled: toggles.allowGlobal, map_marker: publicNumber, payment_method: Number(newValue), line_one_address: form.lineOne, line_two_address: form.lineTwo, line_three_address: form.lineThree, line_four_address: form.lineFour, country: form.country, description: form.description });
    } catch (error) {
      toast.error(error instanceof AuthApiError ? error.message : "Failed to update payment method");
      setPaymentMethod(previous);
      return;
    }
    toast.success("Payment method updated");
  };

  // Update GPS
  const handleUpdateGPS = async () => {
    if (!['1', '2'].includes(String(user?.paid_user))) {
      toast.error("Only pro members can update GPS");
      return;
    }
    if (!company || !navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setPendingGps({ lat: latitude, lng: longitude });
      setGpsDialogOpen(true);
    }, () => toast.error("Could not get location"));
  };

  const handleConfirmGpsUpdate = async () => {
    if (!company || !pendingGps) return;
    let ok = false;
    try { setCompany(await updateOwnedCompany({ name: form.shopName, mobile_number: form.mobileNumber, company_email: form.companyEmail, latitude: pendingGps.lat, longitude: pendingGps.lng, opening_time: form.openTime, closing_time: form.closeTime, table_numbers: form.notificationCount, notifications_enabled: form.notifications === "1", orders_enabled: toggles.liveOrders, takeaway_enabled: toggles.takeaways, delivery_enabled: toggles.deliveries, global_enabled: toggles.allowGlobal, map_marker: publicNumber, payment_method: Number(paymentMethod), line_one_address: form.lineOne, line_two_address: form.lineTwo, line_three_address: form.lineThree, line_four_address: form.lineFour, country: form.country, description: form.description })); ok = true; } catch { ok = false; }
    setGpsDialogOpen(false);
    setPendingGps(null);
    if (ok) toast.success("GPS updated!");
    else toast.error("Failed to update GPS");
  };

  // Add Products — mirrors MAUI: save profile, check group count, branch
  const handleAddProducts = async () => {
    if (addProductsLoading) return;
    if (!company || !Number(company.id)) {
      toast.error("Please create a company first");
      return;
    }
    setAddProductsLoading(true);
    try {
      await handleSave();
      console.log("[handleAddProducts] Checking menu group count for companyid:", company.id);
      const countResult = await countMenuGroups(company.id);
      console.log("[handleAddProducts] countMenuGroups result:", countResult);
      // MAUI logic: if "ZERO" or "0" or empty → first-time setup, else edit
      const hasGroups = countResult !== "ZERO" && countResult !== "0" && countResult.trim() !== "";
      if (hasGroups) {
        console.log("[handleAddProducts] Groups exist, navigating to edit-menu-groups");
        navigate(`/edit-menu-groups?companyId=${company.id}`);
      } else {
        console.log("[handleAddProducts] No groups, navigating to edit-menu-groups (add mode)");
        navigate(`/edit-menu-groups?companyId=${company.id}`);
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

    if (company.id === 0) {
      toast.info("Please create a company first");
      return;
    }

    navigate("/company-orders", { state: { companyId: String(company.id) } });
  };

  // Delete
  const handleDeleteClick = async () => {
    if (!company) return;
    setDeleteBlockerMsg("");
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!company) return;
    try {
      await deleteOwnedCompany();
      setDeleteDialogOpen(false);
      localStorage.removeItem("hasShop");
      toast.success("Shop deleted successfully");
      navigate("/");
    } catch (error) {
      const details = (error as AuthApiError & { details?: { blockers?: Record<string, number> } }).details;
      const blockers = details?.blockers || {};
      const message = Object.entries(blockers).filter(([, count]) => count > 0).map(([name, count]) => `${count} ${name.replaceAll("_", " ")}`).join(", ");
      setDeleteBlockerMsg(message ? `Please delete these records first: ${message}` : (error instanceof Error ? error.message : "Delete failed"));
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
    [t, navigate, company?.id],
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
          {Object.values(form).some((v) => !String(v).trim()) && (
            <ProfileHelpAssistant translationKey="HELPCOMPANYPROFILE" />
          )}
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

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground block">
              {t("EnableNotifications") || "Enable Notifications"}
            </label>
            <select
              value={form.notifications === "1" ? "1" : "0"}
              onChange={(e) => handleChange("notifications", e.target.value)}
              className={`${inputClass} h-10 w-full appearance-none cursor-pointer bg-background text-foreground`}
            >
              <option value="1" className="bg-background text-foreground">{t("Enable") || "Enable"}</option>
              <option value="0" className="bg-background text-foreground">{t("Disable") || "Disable"}</option>
            </select>
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground block">
              {t("PaymentMethod") || "Payment Method"}
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => handlePaymentMethodChange(e.target.value)}
              className={`${inputClass} h-10 w-full appearance-none cursor-pointer bg-background text-foreground`}
            >
              <option value="0" className="bg-background text-foreground">{t("CashOnly") || "Cash only"}</option>
              <option value="1" className="bg-background text-foreground">{t("CardOnly") || "Card only"}</option>
              <option value="2" className="bg-background text-foreground">{t("CashAndCard") || "Cash and Card"}</option>
            </select>
          </div>

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
            <img
              src={selectedMarker.iconUrl}
              alt={selectedMarker.label}
              className="w-16 h-16 object-contain"
            />
            <span className="text-xs font-bold text-muted-foreground mt-1 uppercase">{t(selectedMarker.translationKey)}</span>
          </div>

          <MapMarkerPicker
            open={markerPickerOpen}
            onOpenChange={setMarkerPickerOpen}
            selectedId={publicNumber}
            onSelect={async (marker: MapMarkerOption) => {
              console.log("[MapMarker] Selected:", marker);
              setSelectedMarker({ emoji: marker.emoji, label: marker.label, translationKey: marker.translationKey, iconUrl: marker.iconUrl });
              setPublicNumber(marker.id);
              setMarkerPickerOpen(false);

              if (!company) return;
              try {
                await updateOwnedCompany({ name: form.shopName, mobile_number: form.mobileNumber, company_email: form.companyEmail, latitude: company.latitude, longitude: company.longitude, opening_time: form.openTime, closing_time: form.closeTime, table_numbers: form.notificationCount, notifications_enabled: form.notifications === "1", orders_enabled: toggles.liveOrders, takeaway_enabled: toggles.takeaways, delivery_enabled: toggles.deliveries, global_enabled: toggles.allowGlobal, map_marker: marker.id, payment_method: Number(paymentMethod), line_one_address: form.lineOne, line_two_address: form.lineTwo, line_three_address: form.lineThree, line_four_address: form.lineFour, country: form.country, description: form.description });
                toast.success(t("DetailswereSaved"));
                const refreshed = await getOwnedCompany();
                if (refreshed) setCompany(refreshed);
              } catch {
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
          companyId={company.id}
          companyName={form.shopName || company.name || "Shop"}
        />
      )}

      {/* GPS Update Confirmation Dialog */}
      <AlertDialog open={gpsDialogOpen} onOpenChange={setGpsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update GPS?</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {pendingGps && company
                ? `Old: ${company.latitude || 0}, ${company.longitude || 0}\nNew: ${pendingGps.lat.toFixed(6)}, ${pendingGps.lng.toFixed(6)}`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingGps(null)}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGpsUpdate}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompanyProfile;
