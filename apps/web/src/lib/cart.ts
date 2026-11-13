"use client";

import { useCallback, useEffect, useState } from "react";

// Carrinho guardado no navegador, um por loja.
export type CartItem = {
  /** Identifica a linha do carrinho: mesmo produto com opções diferentes vira outra linha. */
  key: string;
  productId: string;
  name: string;
  /** Preço unitário já com as opções escolhidas. */
  priceCents: number;
  quantity: number;
  notes?: string;
  optionIds?: string[];
  /** Texto das opções para mostrar no carrinho, ex.: "Ao ponto, Bacon". */
  optionsLabel?: string;
};

export function cartKey(productId: string, optionIds: string[] = []) {
  return optionIds.length ? `${productId}:${[...optionIds].sort().join(",")}` : productId;
}

const key = (storeSlug: string) => `cardapio:cart:${storeSlug}`;
const EVENT = "cardapio:cart-change";

function read(storeSlug: string): CartItem[] {
  try {
    const raw = window.localStorage.getItem(key(storeSlug));
    const items = raw ? (JSON.parse(raw) as CartItem[]) : [];
    // Carrinhos salvos antes das opções não tinham `key`.
    return items.map((i) => ({ ...i, key: i.key ?? cartKey(i.productId, i.optionIds) }));
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
    (item: Omit<CartItem, "quantity" | "key">, quantity = 1) =>
      update((current) => {
        const key = cartKey(item.productId, item.optionIds);
        const found = current.find((i) => i.key === key);
        if (found) return current.map((i) => (i === found ? { ...i, quantity: i.quantity + quantity } : i));
        return [...current, { ...item, key, quantity }];
      }),
    [update],
  );

  const setQuantity = useCallback(
    (key: string, quantity: number) =>
      update((current) => current.map((i) => (i.key === key ? { ...i, quantity } : i))),
    [update],
  );

  const setNotes = useCallback(
    (key: string, notes: string) =>
      update((current) => current.map((i) => (i.key === key ? { ...i, notes } : i))),
    [update],
  );

  const clear = useCallback(() => update(() => []), [update]);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalCents = items.reduce((sum, i) => sum + i.quantity * i.priceCents, 0);

  return { items, loaded, count, subtotalCents, add, setQuantity, setNotes, clear };
}
