import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRegisterNavActions } from "@/contexts/SiteNavExtras";
import { useLanguage } from "@/contexts/LanguageContext";
import { isAdminEmail } from "@/lib/adminAccess";

const GlobalAdminNavAction = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { user, status } = useAuth();
  const isAdmin = status === "authenticated" && isAdminEmail(user?.email);

  const handleClick = useCallback(() => {
    navigate("/admin-shops");
  }, [navigate]);

  useRegisterNavActions(
    "global-admin",
    isAdmin
      ? [
          {
            id: "admin-shops",
            label: t("Admin") || "Admin",
            onClick: handleClick,
            order: 50,
          },
        ]
      : [],
    [isAdmin, handleClick, pathname],
  );

  return null;
};

export default GlobalAdminNavAction;
