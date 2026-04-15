/**
 * ============================================================
 * GLOBAL ADVERT CONFIGURATION
 * ============================================================
 * 
 * Central config for the entire advert system.
 * 
 * HOW TO USE:
 * - Toggle adverts globally or by type (image/video)
 * - Define advert creatives in ADVERT_LIBRARY
 * - Assign adverts to pages/slots in PAGE_ADVERT_MAP
 * - Define video triggers in VIDEO_TRIGGERS
 * 
 * GOOGLE ADSENSE:
 * When ready, set each advert's `type` to "adsense" and paste
 * the AdSense HTML snippet into the `adsenseCode` field.
 * ============================================================
 */

// ── Global switches ──────────────────────────────────────────
export const ADVERT_SETTINGS = {
  /** Master kill-switch – set false to disable ALL adverts */
  enabled: true,
  /** Enable/disable image adverts globally */
  imageAdsEnabled: true,
  /** Enable/disable video adverts globally */
  videoAdsEnabled: true,
} as const;

// ── Slot positions available on any page ─────────────────────
export type AdvertSlotPosition =
  | "topBanner"
  | "midPage"
  | "bottomBanner"
  | "sidebar"
  | "inline";

// ── Advert creative types ────────────────────────────────────
export type AdvertType = "image" | "video" | "adsense";

export interface AdvertDefinition {
  id: string;
  type: AdvertType;
  /** Label shown during test mode */
  label: string;
  /** Image URL (for type "image") */
  imageUrl?: string;
  /** Click-through URL (for type "image") */
  linkUrl?: string;
  /** Video URL (for type "video") */
  videoUrl?: string;
  /**
   * GOOGLE ADSENSE INTEGRATION POINT
   * ─────────────────────────────────
   * Replace this with your Google AdSense code snippet.
   * Example:
   *   adsenseCode: `<ins class="adsbygoogle" data-ad-client="ca-pub-XXX" ...></ins>
   *                  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`
   */
  adsenseCode?: string;
  /** Width hint for responsive sizing */
  width?: number;
  /** Height hint for responsive sizing */
  height?: number;
}

// ── Test advert library ──────────────────────────────────────
// Each entry is a creative you can assign to any page/slot.
export const ADVERT_LIBRARY: Record<string, AdvertDefinition> = {
  "test-banner-1": {
    id: "test-banner-1",
    type: "image",
    label: "Test Banner Advert 1",
    imageUrl: "https://placehold.co/728x90/6C3AED/FFFFFF?text=Test+Advert+Banner",
    linkUrl: "#",
    width: 728,
    height: 90,
  },
  "test-banner-2": {
    id: "test-banner-2",
    type: "image",
    label: "Test Banner Advert 2",
    imageUrl: "https://placehold.co/320x50/3B82F6/FFFFFF?text=Test+Advert+Small",
    linkUrl: "#",
    width: 320,
    height: 50,
  },
  "test-video-1": {
    id: "test-video-1",
    type: "video",
    label: "Test Video Advert",
    // Using a public sample video for testing
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  /**
   * ADSENSE TEMPLATE — duplicate & fill in when ready:
   *
   * "adsense-leaderboard": {
   *   id: "adsense-leaderboard",
   *   type: "adsense",
   *   label: "AdSense Leaderboard",
   *   adsenseCode: `<!-- Replace with your Google AdSense code -->`,
   * },
   */
};

// ── Page → Slot → Advert mapping ────────────────────────────
// Key = route path (without leading slash), value = slot→advert-id.
export const PAGE_ADVERT_MAP: Record<string, Partial<Record<AdvertSlotPosition, string>>> = {
  // Example: show test-banner-1 at top of the profile page
  profile: {
    topBanner: "test-banner-1",
  },
  // Example: show small banner at bottom of basket
  basket: {
    bottomBanner: "test-banner-2",
  },
  "qr-scanner": {
    bottomBanner: "test-banner-2",
  },
  /**
   * ADD MORE PAGE MAPPINGS HERE:
   *
   * "shop-interior": {
   *   midPage: "test-banner-1",
   * },
   */
};

// ── Video advert triggers ────────────────────────────────────
// Define named triggers and which video advert they show.
export const VIDEO_TRIGGERS: Record<string, string> = {
  /** Shown when entering a page */
  pageEnter: "test-video-1",
  /** Shown before checkout */
  beforeCheckout: "test-video-1",
  /** Shown after login */
  afterLogin: "test-video-1",
  /**
   * ADD MORE TRIGGERS HERE:
   * "afterPurchase": "my-video-ad-id",
   */
};
