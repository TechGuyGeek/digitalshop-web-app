import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegisterNavActions } from "@/contexts/SiteNavExtras";

const HIDDEN_ROUTES = new Set(["/", "/oauth-callback"]);

const readUser = (): Record<string, unknown> | null => {
  try {
    const raw = localStorage.getItem("digitalUser");
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const readIsPaid = (): boolean => {
  const u = readUser();
  return u ? String(u.PaidUser ?? u.Paiduser) === "2" : false;
};

const GlobalUpgradeNavAction = () => {
  const { t, language } = useLanguage();
  const { pathname } = useLocation();
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  // Re-read user when storage changes (login/logout/upgrade)
  useEffect(() => {
    const onStorage = () => setTick((n) => n + 1);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleUpgrade = useCallback(async () => {
    const user = readUser();
    const personId = user?.PersonID ?? user?.personID ?? user?.personid ?? user?.PersonId;
    const userEmail = user?.Email ?? user?.email;
    if (!personId || !userEmail) {
      toast.error("Please log in first to upgrade to Pro.");
      return;
    }
    setLoading(true);
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
        },
      );
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error(data?.ServerMessage || "Could not start checkout. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      toast.error(t("Pleasecheckyourinternetconnection"));
      setLoading(false);
    }
  }, [t]);

  const hasUser = !!readUser();
  const isPaid = readIsPaid();
  const shouldShow = !HIDDEN_ROUTES.has(pathname) && hasUser && !isPaid;

  useRegisterNavActions(
    "global-upgrade",
    shouldShow
      ? [
          {
            id: "go-pro",
            label: loading ? t("Pleasewait") || "Please wait..." : t("GoPro") || "Go Pro",
            onClick: handleUpgrade,
            disabled: loading,
          },
        ]
      : [],
    [shouldShow, loading, language, tick],
  );

  return null;
};

export default GlobalUpgradeNavAction;
