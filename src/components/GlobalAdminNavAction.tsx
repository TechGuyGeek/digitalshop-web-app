import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRegisterNavActions } from "@/contexts/SiteNavExtras";

const ADMIN_EMAIL = "jason.purkiss.bsc@gmail.com";

const readAdminEmail = (): string => {
  try {
    const raw = localStorage.getItem("digitalUser");
    if (!raw) return "";
    const u = JSON.parse(raw);
    return String(u?.Email || u?.email || "").trim().toLowerCase();
  } catch {
    return "";
  }
};

const GlobalAdminNavAction = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [email, setEmail] = useState<string>(readAdminEmail);

  // Re-check on route change
  useEffect(() => {
    setEmail(readAdminEmail());
  }, [pathname]);

  // Re-check on storage events from other tabs
  useEffect(() => {
    const onStorage = () => setEmail(readAdminEmail());
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
    };
  }, []);

  // Poll same-tab localStorage (storage event doesn't fire in same tab)
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = readAdminEmail();
      setEmail((prev) => (prev === next ? prev : next));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const isAdmin = email === ADMIN_EMAIL;

  if (typeof window !== "undefined" && email) {
    // eslint-disable-next-line no-console
    console.debug("[admin-nav] email:", email, "isAdmin:", isAdmin);
  }

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
    [isAdmin, handleClick, pathname],
  );

  return null;
};

export default GlobalAdminNavAction;