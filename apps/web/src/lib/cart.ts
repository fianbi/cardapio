"use client";

import { useCallback, useEffect, useState } from "react";

// Carrinho guardado no navegador, um por loja.
export type CartItem = {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  notes?: string;
};

const key = (storeSlug: string) => `cardapio:cart:${storeSlug}`;
const EVENT = "cardapio:cart-change";

function read(storeSlug: string): CartItem[] {
  try {
    const raw = window.localStorage.getItem(key(storeSlug));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function write(storeSlug: string, items: CartItem[]) {
  try {
    if (items.length === 0) window.localStorage.removeItem(key(storeSlug));
    else window.localStorage.setItem(key(storeSlug), JSON.stringify(items));
  } catch {
    // armazenamento indisponível (aba anônima etc.): o carrinho vale só nesta página
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: storeSlug }));
}

export function useCart(storeSlug: string) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(read(storeSlug));
    setLoaded(true);
    const sync = () => setItems(read(storeSlug));
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [storeSlug]);

  const update = useCallback(
    (fn: (items: CartItem[]) => CartItem[]) => {
      const next = fn(read(storeSlug)).filter((i) => i.quantity > 0);
      setItems(next);
      write(storeSlug, next);
    },
    [storeSlug],
  );

  const add = useCallback(
    (item: Omit<CartItem, "quantity">) =>
      update((current) => {
        const found = current.find((i) => i.productId === item.productId);
        if (found) return current.map((i) => (i === found ? { ...i, quantity: i.quantity + 1 } : i));
        return [...current, { ...item, quantity: 1 }];
      }),
    [update],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) =>
      update((current) => current.map((i) => (i.productId === productId ? { ...i, quantity } : i))),
    [update],
  );

  const setNotes = useCallback(
    (productId: string, notes: string) =>
      update((current) => current.map((i) => (i.productId === productId ? { ...i, notes } : i))),
    [update],
  );

  const clear = useCallback(() => update(() => []), [update]);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalCents = items.reduce((sum, i) => sum + i.quantity * i.priceCents, 0);

  return { items, loaded, count, subtotalCents, add, setQuantity, setNotes, clear };
}
