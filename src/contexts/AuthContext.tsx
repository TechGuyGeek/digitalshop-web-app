import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authClient from "@/lib/authClient";
import type { AuthUser } from "@/lib/authClient";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login(email: string, password: string): Promise<AuthUser>;
  logout(): Promise<void>;
  refreshProfile(): Promise<AuthUser>;
  saveProfile(input: Parameters<typeof authClient.updateProfile>[0]): Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sanitizedLegacyUser(user: AuthUser): Record<string, unknown> {
  return {
    PersonID: user.id,
    ID: user.id,
    Email: user.email,
    email: user.email,
    Name: user.first_name,
    name: user.first_name,
    Surname: user.last_name,
    surname: user.last_name,
    MobileNumber: user.mobile_number,
    DateofBirth: user.gender,
    Imagepath: user.image_path,
    Paiduser: user.paid_user,
    PurchaseStated: user.locale,
    LineOneAddress: user.line_one_address,
    LineTwoAddress: user.line_two_address,
    LineThreeAddress: user.line_three_address,
    LineFourAddress: user.line_four_address,
    LineCountryAddress: user.line_country_address,
    LineDeliveryNotesAddress: user.delivery_notes,
    emailVerified: user.email_verified,
  };
}

function persistSafeUser(user: AuthUser | null): void {
  if (user) localStorage.setItem("digitalUser", JSON.stringify(sanitizedLegacyUser(user)));
  else localStorage.removeItem("digitalUser");
  window.dispatchEvent(new Event("gpsshops-auth-changed"));
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let active = true;
    authClient.restoreSession()
      .then((restored) => {
        if (!active) return;
        setUser(restored);
        persistSafeUser(restored);
        setStatus(restored ? "authenticated" : "anonymous");
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        persistSafeUser(null);
        setStatus("anonymous");
      });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const authenticated = await authClient.login(email, password);
    setUser(authenticated);
    setStatus("authenticated");
    persistSafeUser(authenticated);
    return authenticated;
  }, []);

  const logout = useCallback(async () => {
    try { await authClient.logout(); } finally {
      setUser(null);
      setStatus("anonymous");
      persistSafeUser(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await authClient.getProfile();
    setUser(profile);
    persistSafeUser(profile);
    return profile;
  }, []);

  const saveProfile = useCallback(async (input: Parameters<typeof authClient.updateProfile>[0]) => {
    const profile = await authClient.updateProfile(input);
    setUser(profile);
    persistSafeUser(profile);
    return profile;
  }, []);

  const value = useMemo(() => ({ user, status, login, logout, refreshProfile, saveProfile }), [user, status, login, logout, refreshProfile, saveProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
