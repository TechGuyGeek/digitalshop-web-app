import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";

export interface SiteNavAction {
  id: string;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

interface SiteNavExtrasContextValue {
  actions: SiteNavAction[];
  registerGroup: (groupId: string, actions: SiteNavAction[]) => void;
  unregisterGroup: (groupId: string) => void;
}

const SiteNavExtrasContext = createContext<SiteNavExtrasContextValue | null>(null);

export const SiteNavExtrasProvider = ({ children }: { children: ReactNode }) => {
  const [groups, setGroups] = useState<Record<string, SiteNavAction[]>>({});

  const registerGroup = useCallback((groupId: string, actions: SiteNavAction[]) => {
    setGroups((prev) => ({ ...prev, [groupId]: actions }));
  }, []);

  const unregisterGroup = useCallback((groupId: string) => {
    setGroups((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  }, []);

  const actions = useMemo(() => Object.values(groups).flat(), [groups]);

  return (
    <SiteNavExtrasContext.Provider value={{ actions, registerGroup, unregisterGroup }}>
      {children}
    </SiteNavExtrasContext.Provider>
  );
};

export const useSiteNavExtras = () => {
  const ctx = useContext(SiteNavExtrasContext);
  if (!ctx) throw new Error("useSiteNavExtras must be used inside SiteNavExtrasProvider");
  return ctx;
};

/** Register a named group of nav actions. Auto-clears on unmount. */
export const useRegisterNavActions = (groupId: string, actions: SiteNavAction[], deps: unknown[]) => {
  const { registerGroup, unregisterGroup } = useSiteNavExtras();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    registerGroup(groupId, actions);
    return () => unregisterGroup(groupId);
  }, deps);
};
