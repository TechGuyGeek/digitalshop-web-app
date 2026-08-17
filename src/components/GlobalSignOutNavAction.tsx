import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegisterNavActions } from "@/contexts/SiteNavExtras";
import { useAuth } from "@/contexts/AuthContext";

const HIDDEN_ROUTES = new Set(["/", "/oauth-callback"]);

const GlobalSignOutNavAction = () => {
  const { t, language } = useLanguage();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { status, logout } = useAuth();

  const handleLogout = useCallback(async () => {
    await logout();
    toast.success(t("Signin"));
    navigate("/");
  }, [logout, navigate, t]);

  const shouldShow = !HIDDEN_ROUTES.has(pathname) && status === "authenticated";

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
    [shouldShow, language, handleLogout],
  );

  return null;
};

export default GlobalSignOutNavAction;
