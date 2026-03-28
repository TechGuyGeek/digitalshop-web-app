import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Camera, Image, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type DigitalPerson, updateUserProfile } from "@/lib/api";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<DigitalPerson | null>(null);
  const [form, setForm] = useState({
    name: "",
    surname: "",
    gender: "",
    mobileNumber: "",
    lineOne: "",
    lineTwo: "",
    lineThree: "",
    lineFour: "",
    country: "",
    deliveryNotes: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem("digitalUser");
    if (stored) {
      const parsed = JSON.parse(stored) as DigitalPerson;
      setUser(parsed);
      setForm({
        name: (parsed.name || parsed.Name || "") as string,
        surname: (parsed.surname || parsed.Surname || "") as string,
        gender: ((parsed as any).Gender || "") as string,
        mobileNumber: (parsed.MobileNumber || "") as string,
        lineOne: ((parsed as any).LineOneAddress || "") as string,
        lineTwo: ((parsed as any).LineTwoAddress || "") as string,
        lineThree: ((parsed as any).LineThreeAddress || "") as string,
        lineFour: ((parsed as any).LineFourAddress || "") as string,
        country: ((parsed as any).LineCountryAddress || "") as string,
        deliveryNotes: ((parsed as any).DeliveryNotes || "") as string,
      });
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    // Build updated user object with form values mapped to backend field names
    const updatedUser: DigitalPerson = {
      ...user,
      Name: form.name,
      name: form.name,
      Surname: form.surname,
      surname: form.surname,
      MobileNumber: form.mobileNumber,
      Gender: form.gender,
      LineOneAddress: form.lineOne,
      LineTwoAddress: form.lineTwo,
      LineThreeAddress: form.lineThree,
      LineFourAddress: form.lineFour,
      LineCountryAddress: form.country,
      LineDeliveryNotesAddress: form.deliveryNotes,
    } as any;

    const result = await updateUserProfile(updatedUser);
    setSaving(false);

    if (result.success && result.data) {
      // Update local storage with fresh data from server
      const merged = { ...user, ...result.data };
      localStorage.setItem("digitalUser", JSON.stringify(merged));
      setUser(merged);
      toast.success("Profile saved successfully");
    } else {
      toast.error(result.error || "Failed to save profile");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("digitalUser");
    toast.success("Signed out successfully");
    navigate("/");
  };

  const handleDeleteProfile = () => {
    if (window.confirm("Are you sure you want to delete your profile? This cannot be undone.")) {
      localStorage.removeItem("digitalUser");
      toast.success("Profile deleted");
      navigate("/");
      // TODO: call backend delete endpoint
    }
  };

  if (!user) return null;

  const imagePath = (() => {
    const raw = user.Imagepath as string | undefined;
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    // Normalize: ensure path is under /menu1/Images/...
    const base = "https://app.techguygeek.co.uk";
    const cleaned = raw.replace(/^\/+/, "");
    // If path starts with "Images/", prepend menu1/
    const fullPath = cleaned.startsWith("menu1/") ? cleaned : `menu1/${cleaned}`;
    return `${base}/${fullPath}`;
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* Header image area */}
      <div className="relative w-full max-w-lg mx-auto pt-6 px-4">
        <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-card border border-border mb-4">
          {imagePath ? (
            <img
              src={imagePath}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={64} className="text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Action buttons under image */}
        <div className="flex justify-center gap-3 mb-6">
          <Button size="sm" className="rounded-full px-5">
            <Camera size={14} className="mr-1.5" />
            Camera
          </Button>
          <Button size="sm" className="rounded-full px-5">
            <Image size={14} className="mr-1.5" />
            Gallery
          </Button>
          <Button size="sm" className="rounded-full px-5" onClick={handleSave}>
            <Save size={14} className="mr-1.5" />
            Save
          </Button>
        </div>

        {/* Title */}
        <h1 className="text-lg font-bold text-foreground font-heading text-center mb-6">
          Edit User Profile
        </h1>

        {/* Editable fields */}
        <div className="space-y-4 mb-8">
          <ProfileField label="Name" value={form.name} onChange={(v) => handleChange("name", v)} />
          <ProfileField label="Last Name" value={form.surname} onChange={(v) => handleChange("surname", v)} />
          <ProfileField label="Gender" value={form.gender} onChange={(v) => handleChange("gender", v)} />
          <ProfileField label="Mobile Number" value={form.mobileNumber} onChange={(v) => handleChange("mobileNumber", v)} />
          <ProfileField label="1st line Address" value={form.lineOne} onChange={(v) => handleChange("lineOne", v)} />
          <ProfileField label="2nd line Address" value={form.lineTwo} onChange={(v) => handleChange("lineTwo", v)} />
          <ProfileField label="3rd line Address" value={form.lineThree} onChange={(v) => handleChange("lineThree", v)} />
          <ProfileField label="4th line Address" value={form.lineFour} onChange={(v) => handleChange("lineFour", v)} />
          <ProfileField label="Country" value={form.country} onChange={(v) => handleChange("country", v)} />
          <ProfileField label="Delivery Notes" value={form.deliveryNotes} onChange={(v) => handleChange("deliveryNotes", v)} />
        </div>

        {/* Delete profile */}
        <Button
          variant="destructive"
          className="w-full mb-4 rounded-full font-semibold"
          onClick={handleDeleteProfile}
        >
          <Trash2 size={16} className="mr-2" />
          DELETE YOUR PROFILE
        </Button>

        {/* Bottom action buttons */}
        <div className="flex gap-2 mb-6">
          <Button variant="secondary" className="flex-1 rounded-full text-sm" onClick={() => {
            // TODO: Check via PHP if user has a shop. For now check localStorage flag.
            const hasShop = localStorage.getItem("hasShop") === "true";
            navigate(hasShop ? "/company-profile" : "/build-shop");
          }}>
            Build Shop
          </Button>
          <Button variant="secondary" className="flex-1 rounded-full text-sm" onClick={() => navigate("/view-shops")}>
            View Shops
          </Button>
          <Button variant="secondary" className="flex-1 rounded-full text-sm" onClick={() => navigate("/orders")}>
            Orders
          </Button>
        </div>

        {/* Sign out */}
        <Button variant="outline" className="w-full mb-8 rounded-full" onClick={handleLogout}>
          <LogOut size={16} className="mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

const ProfileField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
