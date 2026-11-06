"use client";

import { useMemo, useState, useTransition } from "react";
import { formatPrice } from "@/lib/format";
import { QuantityControl } from "@/components/add-to-cart";
import { buttonClass, inputClass } from "@/components/ui";
import { addItemsToTab } from "../actions";

type Product = { id: string; name: string; priceCents: number; category: string };

/** Seletor rápido de produtos para a equipe lançar na comanda. */
export function AddItems({ storeId, tabId, products }: { storeId: string; tabId: string; products: Product[] }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? products.filter((p) => p.name.toLowerCase().includes(term)) : products;
  }, [products, search]);

  const lines = Object.entries(qty).filter(([, q]) => q > 0);
  const total = lines.reduce((s, [id, q]) => s + (products.find((p) => p.id === id)?.priceCents ?? 0) * q, 0);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await addItemsToTab(
        storeId,
        tabId,
        lines.map(([productId, quantity]) => ({ productId, quantity })),
        notes,
      );
      if (result.ok) {
        setQty({});
        setNotes("");
        setSearch("");
      } else setError(result.error);
    });
  }

  let lastCategory = "";
  return (
    <section className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="font-semibold">Lançar itens</h2>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar produto"
        aria-label="Buscar produto"
        className={inputClass}
      />
      <ul className="max-h-80 divide-y divide-stone-100 overflow-y-auto">
        {filtered.map((p) => {
          const header = p.category !== lastCategory ? (lastCategory = p.category) : null;
          return (
            <li key={p.id}>
              {header && !search && <p className="pt-3 text-xs font-semibold uppercase text-stone-500">{header}</p>}
              <div className="flex items-center justify-between gap-3 py-2">
                <div className="text-sm">
                  <p>{p.name}</p>
                  <p className="text-stone-500">{formatPrice(p.priceCents)}</p>
                </div>
                {qty[p.id] ? (
                  <QuantityControl
                    quantity={qty[p.id]}
                    label={p.name}
                    onChange={(q) => setQty((s) => ({ ...s, [p.id]: Math.max(q, 0) }))}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setQty((s) => ({ ...s, [p.id]: 1 }))}
                    className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
                    aria-label={`Lançar ${p.name}`}
                  >
                    +
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {lines.length > 0 && (
        <div className="space-y-2 border-t border-stone-200 pt-3">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observação para a cozinha (opcional)"
            className={inputClass}
          />
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="button" onClick={submit} disabled={pending} className={`${buttonClass} w-full`}>
            {pending ? "Lançando..." : `Lançar ${lines.reduce((s, [, q]) => s + q, 0)} item(ns) · ${formatPrice(total)}`}
          </button>
        </div>
      )}
    </section>
  );
}
