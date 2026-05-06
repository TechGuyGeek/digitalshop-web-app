import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRegisterNavActions } from "@/contexts/SiteNavExtras";

const ADMIN_EMAIL = "jason.purkiss.bsc@gmail.com";

const GlobalAdminNavAction = () => {
  const navigate = useNavigate();

  const email = (() => {
    try {
      const raw = localStorage.getItem("digitalUser");
      if (!raw) return "";
      const u = JSON.parse(raw);
      return String(u?.Email || u?.email || "").toLowerCase();
    } catch {
      return "";
    }
  })();

  const isAdmin = email === ADMIN_EMAIL;

  const handleClick = useCallback(() => {
    navigate("/admin-shops");
  }, [navigate]);

  useRegisterNavActions(
    "global-admin",
    isAdmin
      ? [
          {
            id: "admin-shops",
            label: "Admin",
            onClick: handleClick,
            order: 50,
          },
        ]
      : [],
    [isAdmin, handleClick],
  );

  return null;
};

export default GlobalAdminNavAction;