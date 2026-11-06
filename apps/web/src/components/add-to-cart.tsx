"use client";

import { useCart } from "@/lib/cart";

type Props = {
  storeSlug: string;
  product: { id: string; name: string; priceCents: number };
  disabled?: boolean;
};

export function AddToCart({ storeSlug, product, disabled }: Props) {
  const { items, add, setQuantity } = useCart(storeSlug);
  const quantity = items.find((i) => i.productId === product.id)?.quantity ?? 0;

  if (disabled) return null;

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

  return <QuantityControl quantity={quantity} onChange={(q) => setQuantity(product.id, q)} label={product.name} />;
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
