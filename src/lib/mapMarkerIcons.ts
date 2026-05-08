// Centralized map marker icon mapping.
// Icons are hosted remotely so the web app and MAUI app share identical assets.
// To add a new category, add an entry to CATEGORY_ICON_URLS keyed by category id
// (matching SHOP_CATEGORIES in shopCategories.ts).

const ICON_BASE = "https://gpsshops.com/map-icons/";

export const DEFAULT_MARKER_ICON = ICON_BASE + "shop01.png";

// Map category id -> remote PNG file name
export const CATEGORY_ICON_URLS: Record<number, string> = {
  0: ICON_BASE + "google09.png",      // Google
  1: ICON_BASE + "shop01.png",        // Shop
  2: ICON_BASE + "pub02.png",         // Pub
  3: ICON_BASE + "cafe03.png",        // Cafe
  4: ICON_BASE + "restaurant04.png",  // Restaurant
  5: ICON_BASE + "home05.png",        // Home Business
  6: ICON_BASE + "mobile06.png",      // Mobile Business
  7: ICON_BASE + "toys07.png",        // Toys
  8: ICON_BASE + "sandwichs08.png",   // Sandwiches
  9: ICON_BASE + "google09.png",      // Google (alt)
  10: ICON_BASE + "breakfast10.png",  // Breakfast
  11: ICON_BASE + "clothing11.png",   // Mens Clothing
  12: ICON_BASE + "clothing12.png",   // Ladies Clothing
};

// Emoji -> category id reverse lookup, for places that only have the emoji.
const EMOJI_TO_CATEGORY_ID: Record<string, number> = {
  "📍": 0,
  "🏪": 1,
  "🍻": 2,
  "☕": 3,
  "🍴": 4,
  "🏠": 5,
  "🎪": 6,
  "🧸": 7,
  "🥪": 8,
  "🍳": 10,
  "👔": 11,
  "👗": 12,
};

export function getMarkerIconUrl(opts: { categoryCode?: number; emoji?: string }): string {
  if (opts.categoryCode != null && CATEGORY_ICON_URLS[opts.categoryCode]) {
    return CATEGORY_ICON_URLS[opts.categoryCode];
  }
  if (opts.emoji && EMOJI_TO_CATEGORY_ID[opts.emoji] != null) {
    return CATEGORY_ICON_URLS[EMOJI_TO_CATEGORY_ID[opts.emoji]];
  }
  return DEFAULT_MARKER_ICON;
}
