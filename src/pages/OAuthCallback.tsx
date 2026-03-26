import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const serverMessage = searchParams.get("ServerMessage");
    const email = searchParams.get("email");
    const name = searchParams.get("name");
    const surname = searchParams.get("surname");

    if (serverMessage === "Success" && email) {
      const user = {
        Email: email,
        Name: name || "",
        Surname: surname || "",
      };
      localStorage.setItem("digitalUser", JSON.stringify(user));
      toast.success(`Welcome, ${name || email}!`);
      navigate("/profile", { replace: true });
    } else {
      toast.error(serverMessage || "OAuth login failed");
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
