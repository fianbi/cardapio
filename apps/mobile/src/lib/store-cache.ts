import type { StoreMenu } from "./api";

// A tela do produto reaproveita o cardápio que a tela da loja acabou de baixar.
const cache = new Map<string, StoreMenu>();

export function rememberStore(store: StoreMenu) {
  cache.set(store.slug, store);
}

export function cachedStore(slug: string) {
  return cache.get(slug) ?? null;
}
