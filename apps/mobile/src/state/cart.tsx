import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { addToCart, cartCount, cartSubtotal, setCartQuantity, type Cart, type CartItem } from "@cardapio/shared";
import { loadJson, saveJson } from "@/lib/storage";

const KEY = "cardapio.cart";

type CartState = {
  cart: Cart;
  count: number;
  subtotalCents: number;
  /** Adiciona um item. Se o carrinho for de outra loja, ele é substituído (a tela confirma antes). */
  add: (store: { slug: string; name: string }, item: Omit<CartItem, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadJson<Cart>(KEY).then((saved) => {
      if (saved?.items?.length) setCart(saved);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) void saveJson(KEY, cart);
  }, [cart, loaded]);

  const add = useCallback<CartState["add"]>((store, item) => setCart((current) => addToCart(current, store, item)), []);
  const setQuantity = useCallback((key: string, quantity: number) => setCart((c) => setCartQuantity(c, key, quantity)), []);
  const clear = useCallback(() => setCart(null), []);

  const value = useMemo<CartState>(
    () => ({ cart, count: cartCount(cart), subtotalCents: cartSubtotal(cart), add, setQuantity, clear }),
    [cart, add, setQuantity, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart fora do CartProvider");
  return ctx;
}
