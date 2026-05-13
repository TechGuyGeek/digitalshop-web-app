import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Accept multiple param shapes from different PHP callbacks
    const serverMessage = searchParams.get("ServerMessage");
    const status = searchParams.get("status");
    const email = searchParams.get("email") || searchParams.get("Email");
    const name = searchParams.get("name") || searchParams.get("Name");
    const surname = searchParams.get("surname") || searchParams.get("Surname");
    const personId = searchParams.get("personId") || searchParams.get("PersonID");
    const password = searchParams.get("password") || searchParams.get("Password");
    const error = searchParams.get("error") || searchParams.get("ServerMessage");

    const ok =
      serverMessage === "Success" ||
      (status && status.toLowerCase() === "success");

    if (ok && email) {
      const user: Record<string, unknown> = {
        Email: email,
        Name: name || "",
        Surname: surname || "",
      };
      if (personId) {
        user.PersonID = personId;
        user.ID = personId;
      }
      if (password) user.Password = password;
      localStorage.setItem("digitalUser", JSON.stringify(user));
      toast.success(`Welcome, ${name || email}!`);
      navigate("/profile", { replace: true });
    } else {
      toast.error(error || "OAuth login failed");
      navigate("/", { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Signing you in…</p>
    </div>
  );
};

export default OAuthCallback;
