const KEY = "gpsshops_help_enabled";
const EVENT = "gpsshops:help-pref-changed";

export function getHelpEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(KEY);
  if (v === null) return true; // default ON
  return v === "1";
}

export function setHelpEnabled(enabled: boolean) {
  try {
    localStorage.setItem(KEY, enabled ? "1" : "0");
    window.dispatchEvent(new CustomEvent(EVENT, { detail: enabled }));
  } catch {}
}

export function onHelpPrefChange(cb: (enabled: boolean) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent).detail as boolean);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}