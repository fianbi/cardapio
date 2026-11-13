"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { groupHint, optionsLabel, selectOptions, type OptionGroupLike } from "@/lib/options";

type Props = {
  storeSlug: string;
  product: { id: string; name: string; priceCents: number; optionGroups?: OptionGroupLike[] };
  disabled?: boolean;
};

export function AddToCart({ storeSlug, product, disabled }: Props) {
  const { items, add, setQuantity } = useCart(storeSlug);
  const [picking, setPicking] = useState(false);
  const groups = product.optionGroups ?? [];
  const lines = items.filter((i) => i.productId === product.id);
  const quantity = lines.reduce((s, i) => s + i.quantity, 0);

  if (disabled) return null;

  // Produto com opções: sempre abre a escolha (cada combinação vira uma linha do carrinho).
  if (groups.length > 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          {quantity > 0 ? `Adicionar (${quantity})` : "Adicionar"}
        </button>
        {picking && (
          <OptionPicker
            product={{ ...product, optionGroups: groups }}
            onClose={() => setPicking(false)}
            onConfirm={(optionIds, label, unitCents, qty) => {
              add({ productId: product.id, name: product.name, priceCents: unitCents, optionIds, optionsLabel: label }, qty);
              setPicking(false);
            }}
          />
        )}
      </>
    );
  }

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={() => add({ productId: product.id, name: product.name, priceCents: product.priceCents })}
        className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
      >
        Adicionar
      </button>
    );
  }

  return <QuantityControl quantity={quantity} onChange={(q) => setQuantity(lines[0].key, q)} label={product.name} />;
}

function OptionPicker({
  product,
  onClose,
  onConfirm,
}: {
  product: { name: string; priceCents: number; optionGroups: OptionGroupLike[] };
  onClose: () => void;
  onConfirm: (optionIds: string[], label: string, unitCents: number, quantity: number) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const result = selectOptions(product.optionGroups, selected);
  const unitCents = product.priceCents + (result.ok ? result.extraCents : 0);

  function toggle(group: OptionGroupLike, optionId: string) {
    setSelected((current) => {
      if (current.includes(optionId)) return current.filter((id) => id !== optionId);
      const inGroup = group.options.filter((o) => current.includes(o.id)).map((o) => o.id);
      // Grupo de escolha única troca a opção; os demais respeitam o máximo.
      if (group.maxSelect === 1) return [...current.filter((id) => !inGroup.includes(id)), optionId];
      if (inGroup.length >= group.maxSelect) return current;
      return [...current, optionId];
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Opções de ${product.name}`}
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl bg-white p-4 sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold">{product.name}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="px-2 text-xl text-stone-500">
            ×
          </button>
        </div>

        {product.optionGroups.map((group) => (
          <fieldset key={group.id} className="mt-4">
            <legend className="flex w-full items-center justify-between text-sm font-semibold">
              <span>{group.name}</span>
              <span className="text-xs font-normal text-stone-500">
                {groupHint(group)}
                {group.minSelect > 0 && " · obrigatório"}
              </span>
            </legend>
            <ul className="mt-2 divide-y divide-stone-100 rounded-md border border-stone-200">
              {group.options.map((o) => (
                <li key={o.id}>
                  <label className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${o.isAvailable ? "" : "opacity-50"}`}>
                    <input
                      type={group.maxSelect === 1 ? "radio" : "checkbox"}
                      name={group.id}
                      disabled={!o.isAvailable}
                      checked={selected.includes(o.id)}
                      onChange={() => toggle(group, o.id)}
                      onClick={() => {
                        // Permite desmarcar um radio de grupo opcional.
                        if (group.maxSelect === 1 && group.minSelect === 0 && selected.includes(o.id)) toggle(group, o.id);
                      }}
                    />
                    <span className="flex-1">
                      {o.name}
                      {!o.isAvailable && " (em falta)"}
                    </span>
                    {o.priceCents > 0 && <span className="text-stone-600">+ {formatPrice(o.priceCents)}</span>}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}

        {!result.ok && <p className="mt-3 text-sm text-stone-500">{result.error}</p>}

        <div className="mt-4 flex items-center justify-between gap-3">
          <QuantityControl quantity={quantity} onChange={(q) => setQuantity(Math.max(1, q))} label={product.name} />
          <button
            type="button"
            disabled={!result.ok}
            onClick={() => result.ok && onConfirm(selected, optionsLabel(result.chosen), unitCents, quantity)}
            className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Adicionar · {formatPrice(unitCents * quantity)}
          </button>
        </div>
      </div>
    </div>
  );
}

export function QuantityControl({
  quantity,
  onChange,
  label,
}: {
  quantity: number;
  onChange: (q: number) => void;
  label: string;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-stone-300 bg-white">
      <button
        type="button"
        aria-label={`Remover um ${label}`}
        onClick={() => onChange(quantity - 1)}
        className="px-3 py-1.5 text-brand-700 hover:bg-stone-100"
      >
        −
      </button>
      <span className="min-w-6 text-center text-sm font-medium" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        aria-label={`Adicionar mais um ${label}`}
        onClick={() => onChange(quantity + 1)}
        className="px-3 py-1.5 text-brand-700 hover:bg-stone-100"
      >
        +
      </button>
    </div>
  );
}
