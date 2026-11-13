// Carrinho do aplicativo (um por vez, de uma única loja). Funções puras: o app só guarda o resultado.

export type CartItem = {
  /** Identifica a linha: mesmo produto com opções diferentes vira outra linha. */
  key: string;
  productId: string;
  name: string;
  /** Preço unitário já com as opções escolhidas. */
  unitPriceCents: number;
  quantity: number;
  optionIds: string[];
  /** Texto das opções, ex.: "Ao ponto, Bacon". */
  optionsLabel: string;
  notes: string;
};

export type Cart = { storeSlug: string; storeName: string; items: CartItem[] } | null;

export const MAX_QUANTITY = 99;

export function cartKey(productId: string, optionIds: string[] = [], notes = "") {
  const options = optionIds.length ? `:${[...optionIds].sort().join(",")}` : "";
  const note = notes.trim() ? `#${notes.trim().toLowerCase()}` : "";
  return `${productId}${options}${note}`;
}

/** Adiciona um item. Item igual (mesmas opções e observação) soma a quantidade. Outra loja troca o carrinho. */
export function addToCart(
  cart: Cart,
  store: { slug: string; name: string },
  item: Omit<CartItem, "key">,
): NonNullable<Cart> {
  const key = cartKey(item.productId, item.optionIds, item.notes);
  const items = cart && cart.storeSlug === store.slug ? cart.items : [];
  const found = items.find((i) => i.key === key);
  const next = found
    ? items.map((i) => (i === found ? { ...i, quantity: Math.min(MAX_QUANTITY, i.quantity + item.quantity) } : i))
    : [...items, { ...item, key, quantity: Math.min(MAX_QUANTITY, item.quantity) }];
  return { storeSlug: store.slug, storeName: store.name, items: next };
}

/** Muda a quantidade de uma linha; zero remove. Carrinho sem itens vira null. */
export function setCartQuantity(cart: Cart, key: string, quantity: number): Cart {
  if (!cart) return null;
  const items = cart.items
    .map((i) => (i.key === key ? { ...i, quantity: Math.min(MAX_QUANTITY, Math.max(0, Math.round(quantity))) } : i))
    .filter((i) => i.quantity > 0);
  return items.length ? { ...cart, items } : null;
}

export function cartCount(cart: Cart) {
  return cart ? cart.items.reduce((s, i) => s + i.quantity, 0) : 0;
}

export function cartSubtotal(cart: Cart) {
  return cart ? cart.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0) : 0;
}

/** Itens no formato que a API de pedidos espera. */
export function cartToOrderItems(cart: Cart) {
  return (cart?.items ?? []).map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    optionIds: i.optionIds,
    notes: i.notes || undefined,
  }));
}
