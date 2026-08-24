import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // The legacy OAuth callbacks return identity and (for Facebook) a newly
    // generated plaintext password in the URL.  They do not create a
    // canonical V1 session, so accepting them would bypass /me and persist
    // credentials in browser history/storage.  Leave the route as a safe
    // terminal landing page until the backend exposes a canonical OAuth
    // contract.
    localStorage.removeItem("digitalUser");
    toast.error("Social sign-in is not available yet. Please use email and password.");
    navigate("/", { replace: true });
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Signing you in…</p>
    </div>
  );
};

export default OAuthCallback;
