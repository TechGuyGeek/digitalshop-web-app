import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Globe, Palette, HelpCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loginUser, registerUser, type DigitalPerson } from "@/lib/api";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [helpEnabled, setHelpEnabled] = useState(false);
  const [view, setView] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  // Register fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [language, setLanguage] = useState("en-GB");

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const user = await loginUser(email, password);
      if (user && (user.Email || user.email)) {
        toast.success(`Welcome back, ${user.Name || user.name || user.Email || user.email}!`);
        localStorage.setItem("digitalUser", JSON.stringify(user));
        navigate("/profile");
      } else {
        toast.error("Invalid email or password");
      }
    } catch (err) {
      toast.error("Connection error. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      const result = await registerUser({
        name: firstName,
        surname: lastName,
        dateOfBirth,
        email,
        password,
        mobileNumber,
        language,
      });
      if (result && !result.toLowerCase().includes("error") && !result.toLowerCase().includes("exist")) {
        toast.success("Registration successful! You can now sign in.");
        setView("login");
      } else {
        toast.error(result || "Registration failed");
      }
    } catch (err) {
      toast.error("Connection error. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div
        className="relative w-full max-w-md animate-fade-in"
        style={{ animationDelay: "0.1s" }}
      >
        {/* Back arrow for register */}
        {view === "register" && (
          <button
            onClick={() => setView("login")}
            className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Sign In
          </button>
        )}

        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary animate-glow-pulse">
            <span className="text-2xl font-bold text-primary-foreground font-heading">L</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground font-heading">
            {view === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {view === "login"
              ? "Sign in to continue"
              : "Register for a new account"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/5">
          <div className="space-y-4">
            {/* Register-only fields */}
            {view === "register" && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-heading">
                    First Name
                  </label>
                  <Input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-heading">
                    Last Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11 bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                  />
                </div>
              </>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-heading">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-heading">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-secondary border-0 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {view === "login" && (
                <div className="text-right">
                  <button className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                    Reset Login Password
                  </button>
                </div>
              )}
            </div>

            {/* Register-only: DOB & Mobile */}
            {view === "register" && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-heading">
                    Date of Birth
                  </label>
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="h-11 bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-heading">
                    Mobile Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="Mobile Number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="h-11 bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                  />
                </div>
              </>
            )}

            {/* Help Toggle */}
            <div className="flex items-center gap-3 py-1">
              <Switch
                checked={helpEnabled}
                onCheckedChange={setHelpEnabled}
              />
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <HelpCircle size={14} />
                <span>Help {helpEnabled ? "On" : "Off"}</span>
              </div>
            </div>

            {/* Theme Select */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-heading">
                <Palette size={12} className="mr-1 inline" />
                Theme
              </label>
              <Select defaultValue="dark">
                <SelectTrigger className="h-11 bg-secondary border-0 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="midnight">Midnight</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language Select */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-heading">
                <Globe size={12} className="mr-1 inline" />
                Language
              </label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-11 bg-secondary border-0 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">American – en-US</SelectItem>
                  <SelectItem value="en-GB">British – en-GB</SelectItem>
                  <SelectItem value="es">Spanish – es</SelectItem>
                  <SelectItem value="fr">French – fr</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-6 space-y-3">
            <Button
              variant="glow"
              size="lg"
              className="w-full"
              disabled={loading}
              onClick={view === "login" ? handleLogin : handleRegister}
            >
              {loading ? "Please wait..." : view === "login" ? "Sign In" : "Register"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setView(view === "login" ? "register" : "login")}
            >
              {view === "login" ? "Register" : "Back to Sign In"}
            </Button>
          </div>

          {/* Social Login Divider */}
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or continue with</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Social Login Buttons */}
          <div className="mt-4 flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 gap-2"
              onClick={() => window.location.href = `https://app.techguygeek.co.uk/menu1/Digitalweb/Auth/google-start.php?returnUrl=${encodeURIComponent(window.location.origin + "/oauth-callback")}`}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 gap-2"
              onClick={() => window.location.href = `https://app.techguygeek.co.uk/menu1/Digitalweb/Auth/facebook-login.php?returnUrl=${encodeURIComponent(window.location.origin + "/oauth-callback")}`}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </Button>
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="mt-4 text-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Button
            variant="ghost"
            className="text-primary hover:text-primary/80"
          >
            Upgrade
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
