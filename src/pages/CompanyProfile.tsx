import { useCallback, useEffect, useRef, useState } from "react";
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
  getOwnedCompany, updateOwnedCompany, deleteOwnedCompany, getOwnedCompanyDeletionStatus, getCompanyImageUrl,
  getMarkerForPublicNumber, type CompanyV1, type CompanyWrite
} from "@/lib/companyApi";
import { useAuth } from "@/contexts/AuthContext";
import { AuthApiError } from "@/lib/authClient";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import ProfileHelpAssistant from "@/components/ProfileHelpAssistant";
import { fetchOwnerStatistics, type OwnerOrderStatistics } from "@/lib/companyOrders";


const MAX_IMAGE_SIZE = 800;

function formatRadius(meters: number): string {
  return meters < 1609.344 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

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
  const [loadError, setLoadError] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(false);
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
  const [imageRevision, setImageRevision] = useState(0);

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
  const [discoveryRadiusMeters, setDiscoveryRadiusMeters] = useState(1609);
  const [statistics, setStatistics] = useState<Record<"today" | "week" | "month", OwnerOrderStatistics> | null>(null);

  const applyCompany = useCallback((next: CompanyV1, cacheBust = imageRevision) => {
    setCompany(next);
    setForm({
      shopName: next.name, mobileNumber: next.mobile_number, companyEmail: next.company_email,
      openTime: next.opening_time, closeTime: next.closing_time,
      notificationCount: next.table_numbers, notifications: next.notifications_enabled ? "1" : "0",
      lineOne: next.line_one_address, lineTwo: next.line_two_address, lineThree: next.line_three_address,
      lineFour: next.line_four_address, country: next.country, description: next.description,
    });
    setToggles({
      liveOrders: next.orders_enabled, takeaways: next.takeaway_enabled,
      deliveries: next.delivery_enabled, allowGlobal: next.global_enabled,
    });
    setPublicNumber(next.map_marker);
    const marker = getMarkerForPublicNumber(String(next.map_marker));
    setSelectedMarker({ emoji: marker.emoji, label: marker.label, translationKey: marker.translationKey, iconUrl: marker.iconUrl });
    const payment = String(next.payment_method);
    setPaymentMethod(["0", "1", "2"].includes(payment) ? payment : "0");
    setStripeEnabled(next.stripe_enabled);
    setDiscoveryRadiusMeters(Number(next.discovery_radius_meters) || 1609);
    setShopImage(getCompanyImageUrl(next.image_path, cacheBust));
  }, [imageRevision]);

  const companyPayload = (overrides: Partial<CompanyWrite> = {}): CompanyWrite => {
    if (!company || !user) throw new Error("Company session is unavailable.");
    const enteredEmail = form.companyEmail.trim();
    const storedEmail = company.company_email.trim();
    return {
      name: form.shopName.trim(), mobile_number: form.mobileNumber.trim(),
      company_email: enteredEmail || storedEmail || user.email.trim(),
      latitude: company.latitude, longitude: company.longitude,
      opening_time: form.openTime, closing_time: form.closeTime, table_numbers: form.notificationCount,
      notifications_enabled: form.notifications === "1", orders_enabled: toggles.liveOrders,
      takeaway_enabled: toggles.takeaways, delivery_enabled: toggles.deliveries, global_enabled: toggles.allowGlobal,
      map_marker: publicNumber, payment_method: Number(paymentMethod),
      line_one_address: form.lineOne, line_two_address: form.lineTwo, line_three_address: form.lineThree,
      line_four_address: form.lineFour, country: form.country, description: form.description,
      discovery_radius_meters: discoveryRadiusMeters,
      ...overrides,
    };
  };

  const persistCompany = async (overrides: Partial<CompanyWrite> = {}): Promise<CompanyV1> => {
    const payload = companyPayload(overrides);
    const updated = await updateOwnedCompany(payload);
    const refreshed = await getOwnedCompany();
    if (!refreshed) throw new Error("The company disappeared after saving.");
    const cacheBust = payload.image_base64 ? Date.now() : imageRevision;
    if (payload.image_base64) setImageRevision(cacheBust);
    applyCompany(refreshed, cacheBust);
    return updated;
  };

  // Load user & company. A null company is a valid no-company state.
  useEffect(() => {
    if (status === "anonymous") { navigate("/"); return; }
    if (status !== "authenticated") return;
    setLoadError("");
    setVerificationRequired(false);
    getOwnedCompany().then(next => {
      if (next) applyCompany(next);
      else setVerificationRequired(user?.email_verified === false);
      setLoading(false);
    }).catch((error) => {
      if (error instanceof AuthApiError && error.code === "email_verification_required") setVerificationRequired(true);
      else setLoadError(error instanceof Error ? error.message : "Unable to load company.");
      setLoading(false);
    });
  }, [applyCompany, navigate, status, user?.email_verified]);

  useEffect(() => {
    if (!company?.id) return;
    fetchOwnerStatistics(String(company.id)).then(setStatistics).catch(() => setStatistics(null));
  }, [company?.id]);

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
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) cameraInputRef.current?.click();
    else setWebcamOpen(true);
  };

  const handleSave = async (): Promise<CompanyV1 | null> => {
    if (!company || !user || saving) return null;
    setSaving(true);
    try {
      const updated = await persistCompany(pendingImageBase64 ? { image_base64: pendingImageBase64 } : {});
      setPendingImageBase64(null);
      toast.success("Company profile saved!");
      return updated;
    } catch (error) {
      toast.error(error instanceof AuthApiError ? error.message : "Save failed");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (field: "liveOrders" | "takeaways" | "deliveries" | "allowGlobal", value: boolean) => {
    if (!company) return;
    if (field === "allowGlobal" && value && !["1", "2"].includes(String(user?.paid_user))) {
      toast.error("You need the paid version to make your Digital Shop Global. Please upgrade.");
      return;
    }
    const previous = toggles;
    const next = { ...toggles, [field]: value };
    setToggles(next);
    try {
      await persistCompany({ orders_enabled: next.liveOrders, takeaway_enabled: next.takeaways, delivery_enabled: next.deliveries, global_enabled: next.allowGlobal });
    } catch {
      setToggles(previous);
      toast.error("Failed to update toggle");
    }
  };

  const handlePaymentMethodChange = async (newValue: string) => {
    const previous = paymentMethod;
    if (newValue === previous) return;
    if ((newValue === "1" || newValue === "2") && !stripeEnabled) {
      toast.error("Stripe needs to be connected before card payments can be enabled.");
      return;
    }
    if (!company || !user) return;
    setPaymentMethod(newValue);
    try {
      await persistCompany({ payment_method: Number(newValue) });
      toast.success("Payment method updated");
    } catch (error) {
      toast.error(error instanceof AuthApiError ? error.message : "Failed to update payment method");
      setPaymentMethod(previous);
    }
  };

  const handleDiscoveryRadiusBlur = async () => {
    if (!company || company.global_discovery_effective) return;
    const next = Math.min(100000, Math.max(100, Math.round(discoveryRadiusMeters) || 100));
    setDiscoveryRadiusMeters(next);
    try { await persistCompany({ discovery_radius_meters: next }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Failed to update discovery radius"); }
  };

  const handleUpdateGPS = async () => {
    if (!["1", "2"].includes(String(user?.paid_user))) { toast.error("Only pro members can update GPS"); return; }
    if (!company || !navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      setPendingGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setGpsDialogOpen(true);
    }, () => toast.error("Could not get location"));
  };

  const handleConfirmGpsUpdate = async () => {
    if (!company || !pendingGps) return;
    try {
      await persistCompany({ latitude: pendingGps.lat, longitude: pendingGps.lng });
      toast.success("GPS updated!");
    } catch { toast.error("Failed to update GPS"); }
    setGpsDialogOpen(false);
    setPendingGps(null);
  };

  // Add Products — save the profile before entering the canonical menu-group editor.
  const handleAddProducts = async () => {
    if (addProductsLoading) return;
    if (!company || !Number(company.id)) {
      toast.error("Please create a company first");
      return;
    }
    setAddProductsLoading(true);
    try {
      await handleSave();
      navigate(`/edit-menu-groups?companyId=${company.id}`);
    } catch (err) {
      console.error("[handleAddProducts] Error:", err);
      toast.error("Unable to save the company before editing products.");
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
    try {
      const status = await getOwnedCompanyDeletionStatus();
      const blockers = Object.entries(status.blockers)
        .filter(([, count]) => count > 0)
        .map(([name, count]) => `${count} ${name.replace(/_/g, " ")}`)
        .join(", ");
      if (status.safe_to_delete !== true || blockers) {
        setDeleteBlockerMsg(blockers ? `Please delete these records first: ${blockers}` : "Company deletion is currently blocked.");
      }
      setDeleteDialogOpen(true);
    } catch (error) {
      setDeleteBlockerMsg(error instanceof Error ? error.message : "Unable to verify company deletion safety.");
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!company) return;
    try {
      await deleteOwnedCompany();
      setDeleteDialogOpen(false);
      setCompany(null);
      localStorage.removeItem("hasShop");
      toast.success("Shop deleted successfully");
      navigate("/profile", { replace: true });
    } catch (error) {
      const details = (error as AuthApiError & { details?: { blockers?: Record<string, number> } }).details;
      const blockers = details?.blockers || {};
      const message = Object.entries(blockers).filter(([, count]) => count > 0).map(([name, count]) => `${count} ${name.replace(/_/g, " ")}`).join(", ");
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
            {loadError ? (
              <p className="text-destructive text-lg">{loadError}</p>
            ) : verificationRequired ? (
              <p className="text-muted-foreground text-lg">Please verify your email before creating a company.</p>
            ) : (
              <>
                <p className="text-muted-foreground text-lg mb-4">{t("Pleasecreateacompanyfirst")}</p>
                <Button onClick={() => navigate("/build-shop")}>{t("Build")}</Button>
              </>
            )}
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

        {statistics && (
          <div className="grid grid-cols-3 gap-2 px-6 mb-5">
            {(["today", "week", "month"] as const).map((bucket) => (
              <div key={bucket} className="rounded-lg border border-border bg-card p-2 text-center">
                <p className="text-xs font-semibold text-muted-foreground">{t(bucket === "today" ? "Today" : bucket === "week" ? "Week" : "Month")}</p>
                <p className="text-lg font-bold text-foreground">{statistics[bucket].orders}</p>
                <p className="text-[10px] text-muted-foreground">Orders · {statistics[bucket].products} Products</p>
              </div>
            ))}
          </div>
        )}

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
              <span className="text-sm text-foreground">Show on Global Shops{toggles.allowGlobal ? " (enabled)" : ""}</span>
              <Switch checked={toggles.allowGlobal} onCheckedChange={v => handleToggle("allowGlobal", v)} />
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <label className="text-xs text-muted-foreground block">Discovery radius</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={100}
                max={100000}
                step={1}
                value={company.global_discovery_effective ? Math.round(company.effective_discovery_radius_meters || 100000) : discoveryRadiusMeters}
                disabled={Boolean(company.global_discovery_effective)}
                onChange={(event) => setDiscoveryRadiusMeters(Math.min(100000, Math.max(100, Number(event.target.value) || 100)))}
                onBlur={() => void handleDiscoveryRadiusBlur()}
                className={inputClass}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{company.global_discovery_effective ? "m (server effective)" : "m"}</span>
            </div>
            <p className="text-xs text-muted-foreground">{company.global_discovery_effective ? `Global Shops uses the server-controlled effective range (≈ ${formatRadius(Number(company.effective_discovery_radius_meters) || 100000)}).` : `Local discovery: ≈ ${formatRadius(discoveryRadiusMeters)}.`}</p>
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
              const previous = publicNumber;
              setSelectedMarker({ emoji: marker.emoji, label: marker.label, translationKey: marker.translationKey, iconUrl: marker.iconUrl });
              setPublicNumber(marker.id);
              setMarkerPickerOpen(false);

              if (!company) return;
              try {
                await persistCompany({ map_marker: marker.id });
                toast.success(t("DetailswereSaved"));
              } catch {
                setPublicNumber(previous);
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
