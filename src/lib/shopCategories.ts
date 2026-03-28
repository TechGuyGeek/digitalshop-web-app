export interface ShopCategory {
  id: number;
  label: string;
  emoji: string;
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  { id: 0,  label: "Shop",            emoji: "🏪" },
  { id: 1,  label: "Pub",             emoji: "🍻" },
  { id: 2,  label: "Cafe",            emoji: "☕" },
  { id: 3,  label: "Restaurant",      emoji: "🍴" },
  { id: 4,  label: "Home Business",   emoji: "🏠" },
  { id: 5,  label: "Mobile Business", emoji: "🎪" },
  { id: 6,  label: "Toys",            emoji: "🧸" },
  { id: 7,  label: "Sandwiches",      emoji: "🥪" },
  { id: 8,  label: "General",         emoji: "📍" },
  { id: 9,  label: "Breakfast",       emoji: "🍳" },
  { id: 10, label: "Mens Clothing",   emoji: "👔" },
  { id: 11, label: "Ladies Clothing", emoji: "👗" },
  { id: 12, label: "Reserved",        emoji: "📍" },
  { id: 13, label: "Reserved",        emoji: "📍" },
];

export function getCategoryByCode(code: number): ShopCategory {
  return SHOP_CATEGORIES[code] ?? SHOP_CATEGORIES[8];
}
