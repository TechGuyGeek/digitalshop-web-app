import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, User, MessageSquare, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { DigitalPerson } from "@/lib/api";

const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";
const SERVER_DOMAIN2 = "https://app.techguygeek.co.uk/";

async function fetchCustomerProfile(userId: string): Promise<DigitalPerson | null> {
  const url = SERVER_DOMAIN + "menu1/PHPread/User/RetrievUserProfiledetails.php";
  const body = new URLSearchParams({ user_id: userId });
  const res = await fetch(url, { method: "POST", body });
  if (!res.ok) return null;
  const data = await res.json();
  const arr = Array.isArray(data) ? data : data?.data ? (Array.isArray(data.data) ? data.data : [data.data]) : [data];
  return arr.length > 0 ? arr[0] : null;
}

function getProfileImageUrl(person: DigitalPerson): string | null {
  const path = String(person.Imagepath || person.imagename || "");
  if (!path) return null;
  if (path.startsWith("http")) return path;
  // Path like "/Images/UserProfile/xxx.jpeg" → prepend domain + "menu1"
  const clean = path.startsWith("/") ? path : "/" + path;
  return SERVER_DOMAIN + "menu1" + clean;
}

const CustomerProfileReadonly = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userid") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [person, setPerson] = useState<DigitalPerson | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError(true);
      return;
    }
    localStorage.setItem("DontlogmeOut", "true");

    fetchCustomerProfile(userId)
      .then((p) => {
        setPerson(p);
        if (!p) setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [userId]);

  const mobile = person?.MobileNumber || "";
  const email = String(person?.Email || person?.email || "");

  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const normalizeForWhatsApp = (num: string): string => {
    let cleaned = num.replace(/[\s\-()]/g, "");
    if (cleaned.startsWith("0")) cleaned = "44" + cleaned.slice(1);
    return cleaned;
  };

  const handleSms = () => {
    if (!mobile) return;
    if (isMobileDevice) {
      window.open(`sms:${mobile}?body=${encodeURIComponent("Welcome to Digital shop")}`, "_self");
    } else {
      navigator.clipboard.writeText(mobile);
      toast.info("Phone number copied – SMS works best on mobile devices");
    }
  };

  const handlePhone = () => {
    if (!mobile) return;
    if (isMobileDevice) {
      window.open(`tel:${mobile}`, "_self");
    } else {
      navigator.clipboard.writeText(mobile);
      toast.info("Phone number copied – calling works best on mobile devices");
    }
  };

  const handleWhatsApp = () => {
    if (!mobile) return;
    const num = normalizeForWhatsApp(mobile);
    window.open(`https://wa.me/${num}?text=Welcome%20to%20Digital%20shop`, "_blank");
  };

  const handleEmail = () => {
    if (!email) return;
    window.open(`mailto:${email}`, "_self");
  };

  const imgUrl = person ? getProfileImageUrl(person) : null;

  const fields: { label: string; value: string }[] = person
    ? [
        { label: "Name", value: String(person.Name || person.name || "") },
        { label: "LastName", value: String(person.Surname || person.surname || "") },
        { label: "Gender", value: String(person.DateofBirth || "") },
        { label: "Mobile", value: mobile },
        { label: "1st line Address", value: String((person as any).LineOneAddress || "") },
        { label: "2nd line Address", value: String((person as any).LineTwoAddress || "") },
        { label: "3rd line Address", value: String((person as any).LineThreeAddress || "") },
        { label: "4th line Address", value: String((person as any).LineFourAddress || "") },
        { label: "Country", value: String((person as any).LineCountryAddress || "") },
        { label: "Delivery Notes", value: String((person as any).LineDeliveryNotesAddress || "") },
      ]
    : [];

  return (
    <div className="h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">
          Customer Profile
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-sm">Loading profile…</p>
          </div>
        ) : error || !person ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <span className="text-4xl mb-4">⚠️</span>
            <p className="text-sm">Unable to load customer profile</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Profile Image */}
            <div className="w-full aspect-[4/3] bg-muted overflow-hidden">
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt={String(person.Name || "Customer")}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/30 to-muted ${imgUrl ? "hidden" : ""}`}>
                <User className="text-muted-foreground" size={64} />
              </div>
            </div>

            {/* Fields */}
            <div className="px-6 py-4 space-y-0">
              {fields.map((f) => (
                <div key={f.label} className="py-3 border-b border-border">
                  <p className="text-center text-base font-medium text-foreground">
                    {f.value || f.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 px-6 py-4">
              <Button
                variant="outline"
                className="rounded-full text-sm"
                disabled={!mobile}
                onClick={handleSms}
              >
                <MessageSquare size={16} className="mr-1" />
                SMS
              </Button>
              <Button
                variant="outline"
                className="rounded-full text-sm"
                disabled={!mobile}
                onClick={handlePhone}
              >
                <Phone size={16} className="mr-1" />
                Phone
              </Button>
              <Button
                variant="outline"
                className="rounded-full text-sm"
                disabled={!mobile}
                onClick={handleWhatsApp}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </Button>
              <Button
                variant="outline"
                className="rounded-full text-sm"
                disabled={!email}
                onClick={handleEmail}
              >
                <Mail size={16} className="mr-1" />
                Email
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerProfileReadonly;
