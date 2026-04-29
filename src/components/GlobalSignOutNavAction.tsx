import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegisterNavActions } from "@/contexts/SiteNavExtras";

const HIDDEN_ROUTES = new Set(["/", "/oauth-callback"]);

const GlobalSignOutNavAction = () => {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onStorage = () => setTick((n) => n + 1);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const hasUser = (() => {
    try {
      return !!localStorage.getItem("digitalUser");
    } catch {
      return false;
    }
  })();

  const handleLogout = useCallback(() => {
    localStorage.removeItem("digitalUser");
    toast.success(t("Signin"));
    navigate("/");
  }, [navigate, t]);

  const shouldShow = !HIDDEN_ROUTES.has(pathname) && hasUser;

  useRegisterNavActions(
    "global-signout",
    shouldShow
      ? [
          {
            id: "sign-out",
            label: t("Signout") || "Sign out",
            onClick: handleLogout,
            order: 1000, // always last
          },
        ]
      : [],
    [shouldShow, handleLogout, t, tick],
  );

  return null;
};

export default GlobalSignOutNavAction;
