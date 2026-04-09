export interface ShopCategory {
  id: number;
  label: string;
  emoji: string;
}

// IDs must match MAP_MARKER_EMOJIS / MapMarkerPicker PublicNumber values
export const SHOP_CATEGORIES: ShopCategory[] = [
  { id: 0,  label: "Google",           emoji: "📍" },
  { id: 1,  label: "Shop",             emoji: "🏪" },
  { id: 2,  label: "Pub",              emoji: "🍻" },
  { id: 3,  label: "Cafe",             emoji: "☕" },
  { id: 4,  label: "Restaurant",       emoji: "🍴" },
  { id: 5,  label: "Home Business",    emoji: "🏠" },
  { id: 6,  label: "Mobile Business",  emoji: "🎪" },
  { id: 7,  label: "Toys",             emoji: "🧸" },
  { id: 8,  label: "Sandwiches",       emoji: "🥪" },
  { id: 9,  label: "Google",           emoji: "📍" },
  { id: 10, label: "Breakfast",        emoji: "🍳" },
  { id: 11, label: "Mens Clothing",    emoji: "👔" },
  { id: 12, label: "Ladies Clothing",  emoji: "👗" },
  { id: 13, label: "Digits",           emoji: "🔢" },
];

export function getCategoryByCode(code: number): ShopCategory {
  return SHOP_CATEGORIES[code] ?? SHOP_CATEGORIES[0];
}
