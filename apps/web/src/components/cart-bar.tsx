"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

/** Barra fixa no rodapé com o resumo do carrinho e o botão de finalizar. */
export function CartBar({ storeSlug, isOpen }: { storeSlug: string; isOpen: boolean }) {
  const { count, subtotalCents, loaded } = useCart(storeSlug);
  if (!loaded || count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="text-sm">
          <span className="font-semibold">{formatPrice(subtotalCents)}</span>
          <span className="text-stone-500">
            {" "}
            · {count} {count === 1 ? "item" : "itens"}
          </span>
        </div>
        {isOpen ? (
          <Link
            href={`/lojas/${storeSlug}/checkout`}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Ver carrinho
          </Link>
        ) : (
          <span className="text-sm font-medium text-red-600">Loja fechada no momento</span>
        )}
      </div>
    </div>
  );
}
