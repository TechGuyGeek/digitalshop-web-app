// GA4 analytics helper. Page-view tracking and custom events for the SPA.
// Consent Mode v2 defaults are set in index.html before gtag.js loads.
// Use setConsent() from a cookie banner to update grants once the user chooses.

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID =
  (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined) || "";

const isDev = import.meta.env.DEV;
const isGaDebug =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("ga_debug") === "1";
const debugMode = isDev || isGaDebug;
let initialized = false;

const debug = (...args: unknown[]) => {
  if (debugMode) console.log("[GA4]", ...args);
};

function ensureGtag() {
  if (typeof window === "undefined") return null;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
  return window.gtag;
}

/** Initialise GA4 for SPA routing. The gtag.js script is in index.html; this only re-configures. */
export function initGA() {
  if (initialized || typeof window === "undefined") return;
  if (!MEASUREMENT_ID) {
    debug("VITE_GA4_MEASUREMENT_ID is not set — analytics disabled");
    return;
  }
  const gtag = ensureGtag();
  if (!gtag) return;

  // Re-configure for SPA routing: disable automatic page views so we can
  // fire them manually on route changes.
  gtag("config", MEASUREMENT_ID, {
    send_page_view: false,
    debug_mode: debugMode,
  });

  initialized = true;
  debug("initialised", MEASUREMENT_ID);
}

/** Track a single-page-app page view. */
export function trackPageview(path: string, title?: string) {
  if (!MEASUREMENT_ID) return;
  const gtag = ensureGtag();
  if (!gtag) return;
  gtag("event", "page_view", {
    page_path: path,
    page_location: typeof window !== "undefined" ? window.location.href : path,
    page_title: title || (typeof document !== "undefined" ? document.title : undefined),
    send_to: MEASUREMENT_ID,
    ...(debugMode ? { debug_mode: true } : {}),
  });
  debug("page_view", path);
}

/** Track a custom GA4 event. */
export function trackEvent(
  name: string,
  params: Record<string, unknown> = {},
) {
  if (!MEASUREMENT_ID) {
    debug("skipped (no ID)", name, params);
    return;
  }
  const gtag = ensureGtag();
  if (!gtag) return;
  gtag("event", name, {
    ...params,
    send_to: MEASUREMENT_ID,
    ...(debugMode ? { debug_mode: true } : {}),
  });
  debug("event", name, params);
}

/** Named event helpers — keep call sites tidy and event names consistent. */
export const Analytics = {
  registrationStarted: (params?: Record<string, unknown>) =>
    trackEvent("registration_started", params),
  registrationCompleted: (params?: Record<string, unknown>) =>
    trackEvent("registration_completed", params),
  loginCompleted: (params?: Record<string, unknown>) =>
    trackEvent("login_completed", params),
  shopCreationStarted: (params?: Record<string, unknown>) =>
    trackEvent("shop_creation_started", params),
  shopCreated: (params?: Record<string, unknown>) =>
    trackEvent("shop_created", params),
  orderStarted: (params?: Record<string, unknown>) =>
    trackEvent("order_started", params),
  orderCompleted: (params?: Record<string, unknown>) =>
    trackEvent("order_completed", params),
  paymentStarted: (params?: Record<string, unknown>) =>
    trackEvent("payment_started", params),
  paymentCompleted: (params?: Record<string, unknown>) =>
    trackEvent("payment_completed", params),
};

/**
 * Update Consent Mode v2 grants. Call from a cookie banner once the user
 * has made a choice. Pass only the keys you want to change.
 */
export type ConsentState = Partial<{
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
  analytics_storage: "granted" | "denied";
  functionality_storage: "granted" | "denied";
  security_storage: "granted" | "denied";
}>;

export function setConsent(state: ConsentState) {
  const gtag = ensureGtag();
  if (!gtag) return;
  gtag("consent", "update", state);
  debug("consent update", state);
}

export const GA4_MEASUREMENT_ID = MEASUREMENT_ID;
