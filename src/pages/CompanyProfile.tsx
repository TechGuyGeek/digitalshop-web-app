import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Camera, Image as ImageIcon, Save, Trash2, QrCode,
  MapPin, ShoppingBag, ClipboardList, Map, Loader2
} from "lucide-react";
import MapMarkerPicker from "@/components/MapMarkerPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import WebcamCapture from "@/components/WebcamCapture";
import {
  loadCompanyProfile, saveCompanyProfile, toggleOrderEnable, toggleTakeawayEnable,
  toggleDeliveryEnable, toggleGlobalEnable, updateCompanyGPS, countMenuGroups,
  liveOrderCountAll, getDeleteBlockers, deleteCompany, getCompanyImageUrl,
  getMarkerForPublicNumber, type CompanyProfile as CompanyProfileType
} from "@/lib/companyApi";
import type { DigitalPerson } from "@/lib/api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MAX_IMAGE_SIZE = 800;
const TIME_OPTIONS = [
  "01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00",
  "11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00",
  "21:00","22:00","23:00","23:59"
];

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

const CompanyProfile = () => {
  const navigate = useNavigate();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<DigitalPerson | null>(null);
  const [company, setCompany] = useState<CompanyProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState("");
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [markerPickerOpen, setMarkerPickerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBlockerMsg, setDeleteBlockerMsg] = useState("");

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [companyMobile, setCompanyMobile] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("17:00");
  const [tableNumbers, setTableNumbers] = useState("0");
  const [menuNotifications, setMenuNotifications] = useState("Email");
  const [lineOne, setLineOne] = useState("");
  const [lineTwo, setLineTwo] = useState("");
  const [lineThree, setLineThree] = useState("");
  const [lineFour, setLineFour] = useState("");
  const [lineCountry, setLineCountry] = useState("");
  const [description, setDescription] = useState("");
  const [publicNumber, setPublicNumber] = useState("0");

  // Toggles
  const [orderEnable, setOrderEnable] = useState(false);
  const [takeawayEnable, setTakeawayEnable] = useState(false);
  const [deliveryEnable, setDeliveryEnable] = useState(false);
  const [globalEnable, setGlobalEnable] = useState(false);

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
        setCompanyName(c.CompanyName || c.companyname || "");
        setCompanyMobile(c.CompanyMobile || "");
        setCompanyEmail(c.CompanyEmail || "");
        setOpeningTime(c.OpeningTimes || "09:00");
        setClosingTime(c.ClosingTimes || "17:00");
        setTableNumbers(c.TableNumbers || "0");
        setMenuNotifications(c.MenuNotifications || "Email");
        setLineOne(c.LineOneAddress || "");
        setLineTwo(c.LineTwoAddress || "");
        setLineThree(c.LineThreeAddress || "");
        setLineFour(c.LineFourAddress || "");
        setLineCountry(c.LineCountryAddress || "");
        setDescription(c.CompanyDescription || "");
        setPublicNumber(c.PublicNumber || "0");
        setOrderEnable(c.OrderEnable === "1");
        setTakeawayEnable(c.TakeawayEnable === "1");
        setDeliveryEnable(c.DeliveryEnable === "1");
        setGlobalEnable(c.PayOnPhoneEnable === "1");
        const imgUrl = getCompanyImageUrl(c.companyphoto);
        if (imgUrl) setPreviewImage(imgUrl);
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

  // Image handling
  const handleImageSelected = async (file: File) => {
    try {
      const base64 = await resizeAndConvertToBase64(file);
      setPendingImageBase64(base64);
      setPreviewImage(`data:image/jpeg;base64,${base64}`);
      toast.success("Photo selected — tap Save to upload");
    } catch { toast.error("Failed to process image"); }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelected(file);
    e.target.value = "";
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
      companyname: companyName,
      Imagepath: company.Imagepath || "",
      companyphoto: company.companyphoto || "",
      companylat: company.companylat || 0,
      companylong: company.companylong || 0,
      snippet: company.snippet || "",
      companyPhotoBackGround: company.companyPhotoBackGround || "",
      CompanyMobile: companyMobile,
      CompanyEmail: companyEmail,
      companypath: "",
      Switchischecked: "",
      OpeningTimes: openingTime,
      ClosingTimes: closingTime,
      TableNumbers: tableNumbers,
      MenuNotifications: menuNotifications,
      PictureBlob: pendingImageBase64 || "0",
      OrderEnable: orderEnable ? "1" : "0",
      TakeawayEnable: takeawayEnable ? "1" : "0",
      DeliveryEnable: deliveryEnable ? "1" : "0",
      PayOnPhoneEnable: globalEnable ? "1" : "0",
      PublicNumber: publicNumber,
      PrivateNumber: company.PrivateNumber || "",
      LineOneAddress: lineOne,
      LineTwoAddress: lineTwo,
      LineThreeAddress: lineThree,
      LineFourAddress: lineFour,
      LineCountryAddress: lineCountry,
      CompanyDescription: description,
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
  const handleToggleOrder = async (checked: boolean) => {
    setOrderEnable(checked);
    const auth = getUserAuth();
    if (!auth || !company) return;
    const ok = await toggleOrderEnable(company.companyid, checked ? "1" : "0", auth.userId, auth.email, auth.password);
    if (!ok) { setOrderEnable(!checked); toast.error("Failed to update order toggle"); }
  };

  const handleToggleTakeaway = async (checked: boolean) => {
    setTakeawayEnable(checked);
    const auth = getUserAuth();
    if (!auth || !company) return;
    const ok = await toggleTakeawayEnable(company.companyid, checked ? "1" : "0", auth.userId, auth.email, auth.password);
    if (!ok) { setTakeawayEnable(!checked); toast.error("Failed to update takeaway toggle"); }
  };

  const handleToggleDelivery = async (checked: boolean) => {
    setDeliveryEnable(checked);
    const auth = getUserAuth();
    if (!auth || !company) return;
    const ok = await toggleDeliveryEnable(company.companyid, checked ? "1" : "0", auth.userId, auth.email, auth.password);
    if (!ok) { setDeliveryEnable(!checked); toast.error("Failed to update delivery toggle"); }
  };

  const handleToggleGlobal = async (checked: boolean) => {
    if (checked && user?.PaidUser === "0") {
      toast.error("Only paid users can enable Global. Please upgrade.");
      return;
    }
    setGlobalEnable(checked);
    const auth = getUserAuth();
    if (!auth || !company) return;
    const ok = await toggleGlobalEnable(company.companyid, checked ? "1" : "0", auth.userId, auth.email, auth.password);
    if (!ok) { setGlobalEnable(!checked); toast.error("Failed to update global toggle"); }
  };

  // Update GPS
  const handleUpdateGPS = async () => {
    if (user?.PaidUser !== "2") {
      toast.error("Only pro members can update GPS");
      return;
    }
    if (!company) return;
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const oldLat = company.companylat || 0;
      const oldLng = company.companylong || 0;
      const confirm = window.confirm(
        `Update GPS?\n\nOld: ${oldLat}, ${oldLng}\nNew: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      );
      if (!confirm) return;

      const auth = getUserAuth()!;
      const ok = await updateCompanyGPS(company.companyid, latitude, longitude, auth.userId, auth.email, auth.password);
      if (ok) toast.success("GPS updated!");
      else toast.error("Failed to update GPS");
    }, () => toast.error("Could not get location"));
  };

  // Add Products
  const handleAddProducts = async () => {
    await handleSave();
    if (!company) return;
    const count = await countMenuGroups(company.companyid);
    if (count === "ZERO") {
      toast.info("No menu groups yet — opening Add Menu flow");
      // placeholder navigation
    } else {
      toast.info("Opening Edit Menu flow");
      // placeholder navigation
    }
  };

  // View Orders
  const handleViewOrders = async () => {
    await handleSave();
    if (!company) return;
    const counts = await liveOrderCountAll(company.companyid);
    if (counts.today === 0 && counts.week === 0 && counts.month === 0) {
      toast.info("You have no orders");
    } else {
      navigate("/orders");
    }
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
      setDeleteDialogOpen(true);
    } else {
      setDeleteBlockerMsg("");
      setDeleteDialogOpen(true);
    }
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

  const handleMarkerSelect = (emoji: string, label: string) => {
    // reverse lookup PublicNumber from emoji
    const entry = Object.entries(
      (await import("@/lib/companyApi")).MAP_MARKER_EMOJIS
    ).find(([, v]) => v.emoji === emoji);
    // We'll do a simpler approach with the MapMarkerPicker index
  };

  const markerInfo = getMarkerForPublicNumber(publicNumber);

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
          <h1 className="text-lg font-bold text-primary-foreground font-heading">Company Profile</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-muted-foreground text-lg mb-4">No company found for your account.</p>
            <Button onClick={() => navigate("/build-shop")}>Create a Shop</Button>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = "bg-secondary/50 border-border/50 focus-visible:ring-primary/30";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hidden inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <WebcamCapture open={webcamOpen} onOpenChange={setWebcamOpen} onCapture={(b64) => { setPendingImageBase64(b64); setPreviewImage(`data:image/jpeg;base64,${b64}`); toast.success("Photo captured"); }} />

      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-primary">
        <button onClick={() => navigate("/profile")} className="text-primary-foreground"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">Company Profile</h1>
        <div className="ml-auto">
          <Button size="sm" variant="ghost" className="text-primary-foreground" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Company Image */}
        <div className="relative w-full h-52 bg-muted flex items-center justify-center overflow-hidden">
          {previewImage ? (
            <img src={previewImage} alt="Company" className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl">🏪</span>
          )}
          <div className="absolute bottom-3 right-3 flex gap-2">
            <Button size="sm" variant="secondary" className="rounded-full shadow-lg gap-1.5" onClick={handleCameraClick}>
              <Camera size={14} /> Camera
            </Button>
            <Button size="sm" variant="secondary" className="rounded-full shadow-lg gap-1.5" onClick={() => galleryInputRef.current?.click()}>
              <ImageIcon size={14} /> Gallery
            </Button>
          </div>
        </div>

        <div className="px-4 space-y-4 mt-4">
          {/* Company Info */}
          <Card className="bg-card border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Company Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Shop Name</label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Mobile Number</label>
                <Input value={companyMobile} onChange={e => setCompanyMobile(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Company Email</label>
                <Input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} className={inputClass} />
              </div>
            </CardContent>
          </Card>

          {/* Hours & Settings */}
          <Card className="bg-card border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Hours & Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Opening Time</label>
                  <Select value={openingTime} onValueChange={setOpeningTime}>
                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                    <SelectContent>{TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Closing Time</label>
                  <Select value={closingTime} onValueChange={setClosingTime}>
                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                    <SelectContent>{TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Table Numbers</label>
                <Select value={tableNumbers} onValueChange={setTableNumbers}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {Array.from({ length: 1001 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notifications</label>
                <Select value={menuNotifications} onValueChange={setMenuNotifications}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="NoNotifications">No Notifications</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="bg-card border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="1st line address" value={lineOne} onChange={e => setLineOne(e.target.value)} className={inputClass} />
              <Input placeholder="2nd line address" value={lineTwo} onChange={e => setLineTwo(e.target.value)} className={inputClass} />
              <Input placeholder="3rd line address" value={lineThree} onChange={e => setLineThree(e.target.value)} className={inputClass} />
              <Input placeholder="4th line address" value={lineFour} onChange={e => setLineFour(e.target.value)} className={inputClass} />
              <Input placeholder="Country" value={lineCountry} onChange={e => setLineCountry(e.target.value)} className={inputClass} />
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="bg-card border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your shop..."
                className={`${inputClass} min-h-[100px]`}
              />
            </CardContent>
          </Card>

          {/* Toggles */}
          <Card className="bg-card border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Order Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Live Orders</p>
                  <p className="text-xs text-muted-foreground">{orderEnable ? "You're live to receive orders" : "Enable to receive orders"}</p>
                </div>
                <Switch checked={orderEnable} onCheckedChange={handleToggleOrder} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Takeaway</p>
                  <p className="text-xs text-muted-foreground">{takeawayEnable ? "Takeaway enabled" : "Enable takeaway orders"}</p>
                </div>
                <Switch checked={takeawayEnable} onCheckedChange={handleToggleTakeaway} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Delivery</p>
                  <p className="text-xs text-muted-foreground">{deliveryEnable ? "Delivery enabled" : "Enable delivery orders"}</p>
                </div>
                <Switch checked={deliveryEnable} onCheckedChange={handleToggleDelivery} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Global</p>
                  <p className="text-xs text-muted-foreground">{globalEnable ? "Visible globally" : "Local visibility only"}</p>
                </div>
                <Switch checked={globalEnable} onCheckedChange={handleToggleGlobal} />
              </div>
            </CardContent>
          </Card>

          {/* Map Marker */}
          <Card className="bg-card border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Map Marker</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <span className="text-5xl">{markerInfo.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{markerInfo.label}</p>
                  <p className="text-xs text-muted-foreground">Your shop icon on the map</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setMarkerPickerOpen(true)}>
                  <Map size={14} className="mr-1" /> Change
                </Button>
              </div>
            </CardContent>
          </Card>

          <MapMarkerPicker
            open={markerPickerOpen}
            onOpenChange={setMarkerPickerOpen}
            selected={markerInfo.emoji}
            onSelect={(emoji, label) => {
              // Map emoji back to PublicNumber
              const MAP_MARKER_EMOJIS_IMPORT = {
                "📍": "0", "🏪": "1", "🍻": "2", "☕": "3", "🍴": "4",
                "🏠": "5", "🎪": "6", "🧸": "7", "🥪": "8", "🍳": "10",
                "👔": "11", "👗": "12", "🔢": "13",
              } as Record<string, string>;
              setPublicNumber(MAP_MARKER_EMOJIS_IMPORT[emoji] || "0");
            }}
          />

          {/* Management Actions */}
          <Card className="bg-card border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="secondary" className="w-full justify-start gap-2" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? "Saving..." : "Save Profile"}
              </Button>
              <Button variant="secondary" className="w-full justify-start gap-2" onClick={handleAddProducts}>
                <ShoppingBag size={16} /> Add Products
              </Button>
              <Button variant="secondary" className="w-full justify-start gap-2" onClick={handleViewOrders}>
                <ClipboardList size={16} /> View Orders
              </Button>
              <Button variant="secondary" className="w-full justify-start gap-2" onClick={handleUpdateGPS}>
                <MapPin size={16} /> Update GPS
              </Button>
              <Button variant="secondary" className="w-full justify-start gap-2" onClick={() => navigate("/qr-scanner")}>
                <QrCode size={16} /> QR Code Generator
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-destructive/5 border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full gap-2" onClick={handleDeleteClick}>
                <Trash2 size={16} /> Delete Your Shop
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteBlockerMsg ? "Cannot Delete Shop" : "Delete Shop?"}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {deleteBlockerMsg || "This action cannot be undone. Your shop and all its data will be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!deleteBlockerMsg && (
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompanyProfile;
