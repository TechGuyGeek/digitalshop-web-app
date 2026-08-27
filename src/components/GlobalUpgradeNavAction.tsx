import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegisterNavActions } from "@/contexts/SiteNavExtras";
import { beginProCheckout, PaymentUnavailableError } from "@/lib/paymentGateway";

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
      window.location.href = await beginProCheckout({ personId: String(personId), email: String(userEmail) });
    } catch (err) {
      toast.error(err instanceof PaymentUnavailableError ? err.message : t("Pleasecheckyourinternetconnection"));
    } finally {
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
