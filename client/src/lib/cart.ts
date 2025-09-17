// client/src/lib/cart.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@shared/schema";

type UICartItem = {
  /** Unique line id for this cart entry */
  id: string;
  /** Product reference */
  product: Product;
  /** Product id (duplicated for convenience) */
  productId: string;
  /** Price snapshot at time of add (number) */
  priceEach: number;
  /** How many of this product are in the cart */
  quantity: number;
  /** ISO string */
  createdAt: string;
};

interface CartState {
  items: UICartItem[];
  isOpen: boolean;

  addItem: (product: Product, quantity?: number) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;

  openCart: () => void;
  closeCart: () => void;

  getTotalItems: () => number;
  getTotalPrice: () => number;
}

function toNumber(n: unknown): number {
  const v = typeof n === "number" ? n : parseFloat(String(n ?? "0"));
  return Number.isFinite(v) ? v : 0;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, qty = 1) => {
        const quantity = Math.max(1, Math.floor(qty));
        const productId = String(product.id);
        const priceEach = toNumber((product as any)?.price);

        set((state) => {
          const existing = state.items.find((i) => i.productId === productId);
          if (existing) {
            // Increment quantity on the existing line
            return {
              isOpen: true,
              items: state.items.map((i) =>
                i.id === existing.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i,
              ),
            };
          }

          // Create a new line
          const line: UICartItem = {
            id: `line-${Date.now()}-${productId}`,
            product,
            productId,
            priceEach,
            quantity: quantity,
            createdAt: new Date().toISOString(),
          };

          return { isOpen: true, items: [...state.items, line] };
        });
      },

      removeItem: (lineId) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== lineId) }));
      },

      updateQuantity: (lineId, quantity) => {
        const q = Math.floor(quantity);
        if (q <= 0) {
          // Remove when set to 0 or less
          set((state) => ({ items: state.items.filter((i) => i.id !== lineId) }));
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (i.id === lineId ? { ...i, quantity: q } : i)),
        }));
      },

      clearCart: () => set({ items: [] }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getTotalPrice: () =>
        get().items.reduce((sum, i) => sum + i.priceEach * i.quantity, 0),
    }),
    {
      /** New storage key so we don't have to migrate older shapes */
      name: "cart-storage-v2",
      // You can add version & migrate later if you need to evolve the shape
    },
  ),
);
