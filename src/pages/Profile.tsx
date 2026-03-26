import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type DigitalPerson } from "@/lib/api";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<DigitalPerson | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("digitalUser");
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("digitalUser");
    toast.success("Signed out successfully");
    navigate("/");
  };

  if (!user) return null;

  const displayName = `${user.name || user.Name || ""} ${user.surname || user.Surname || ""}`.trim();
  const email = user.email || user.Email || "";
  const mobile = user.MobileNumber || "";
  const dob = user.DateofBirth || "";
  const imagePath = user.Imagepath
    ? `https://app.techguygeek.co.uk${user.Imagepath}`
    : null;

  const addressLines = [
    (user as any).LineOneAddress,
    (user as any).LineTwoAddress,
    (user as any).LineThreeAddress,
    (user as any).LineFourAddress,
    (user as any).LineCountryAddress,
  ].filter(Boolean);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          {imagePath ? (
            <img
              src={imagePath}
              alt={displayName}
              className="mx-auto mb-4 h-20 w-20 rounded-full border-2 border-primary object-cover"
            />
          ) : (
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary">
              <User size={36} className="text-primary-foreground" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground font-heading">
            {displayName || "Your Profile"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back!</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/5 space-y-4">
          <InfoRow icon={<Mail size={16} />} label="Email" value={email} />
          {mobile && <InfoRow icon={<Phone size={16} />} label="Mobile" value={mobile} />}
          {dob && <InfoRow icon={<Calendar size={16} />} label="Date of Birth" value={dob} />}
          {addressLines.length > 0 && (
            <InfoRow icon={<MapPin size={16} />} label="Address" value={addressLines.join(", ")} />
          )}

          <div className="pt-4">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut size={16} className="mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 text-muted-foreground">{icon}</span>
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-heading">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  </div>
);

export default Profile;
