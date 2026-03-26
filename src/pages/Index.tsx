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
