import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface BasketItem {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
  quantity: number;
}

interface BasketContextType {
  items: BasketItem[];
  count: number;
  total: number;
  addItem: (product: Omit<BasketItem, "quantity">) => void;
  removeItem: (id: number) => void;
  clearItem: (id: number) => void;
  clearBasket: () => void;
}

const STORAGE_KEY = "shop_basket";

const loadBasket = (): BasketItem[] => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const BasketContext = createContext<BasketContextType | undefined>(undefined);

export const BasketProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<BasketItem[]>(loadBasket);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const addItem = (product: Omit<BasketItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearItem = (id: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: 1 } : i))
    );
  };

  const clearBasket = () => setItems([]);

  return (
    <BasketContext.Provider value={{ items, count, total, addItem, removeItem, clearItem, clearBasket }}>
      {children}
    </BasketContext.Provider>
  );
};

export const useBasket = () => {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error("useBasket must be used within BasketProvider");
  return ctx;
};
