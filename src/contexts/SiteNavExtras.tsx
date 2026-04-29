import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export interface SiteNavAction {
  id: string;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
}

interface SiteNavExtrasContextValue {
  actions: SiteNavAction[];
  registerActions: (actions: SiteNavAction[]) => void;
  clearActions: () => void;
}

const SiteNavExtrasContext = createContext<SiteNavExtrasContextValue | null>(null);

export const SiteNavExtrasProvider = ({ children }: { children: ReactNode }) => {
  const [actions, setActions] = useState<SiteNavAction[]>([]);
  const registerActions = useCallback((a: SiteNavAction[]) => setActions(a), []);
  const clearActions = useCallback(() => setActions([]), []);
  return (
    <SiteNavExtrasContext.Provider value={{ actions, registerActions, clearActions }}>
      {children}
    </SiteNavExtrasContext.Provider>
  );
};

export const useSiteNavExtras = () => {
  const ctx = useContext(SiteNavExtrasContext);
  if (!ctx) throw new Error("useSiteNavExtras must be used inside SiteNavExtrasProvider");
  return ctx;
};

/** Hook for pages to register menu actions. Auto-clears on unmount. */
export const useRegisterNavActions = (actions: SiteNavAction[], deps: unknown[]) => {
  const { registerActions, clearActions } = useSiteNavExtras();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    registerActions(actions);
    return () => clearActions();
  }, deps);
};
