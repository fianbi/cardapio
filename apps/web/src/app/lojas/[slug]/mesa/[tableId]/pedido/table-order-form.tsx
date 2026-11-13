"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { QuantityControl } from "@/components/add-to-cart";
import { buttonClass, inputClass } from "@/components/ui";
import { placeTableOrder } from "../actions";

const NAME_KEY = "cardapio:table-name";

export function TableOrderForm({
  slug,
  tableId,
  isOpen,
  defaultName,
}: {
  slug: string;
  tableId: string;
  isOpen: boolean;
  defaultName: string;
}) {
  const router = useRouter();
  const cart = useCart(`${slug}--mesa-${tableId}`);
  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Lembra o nome digitado para os próximos pedidos na mesa.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(NAME_KEY);
      if (saved && !defaultName) setName(saved);
    } catch {}
  }, [defaultName]);

  if (!cart.loaded) return null;
  if (cart.count === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-stone-500">
        Nenhum item escolhido.{" "}
        <Link href={`/lojas/${slug}/mesa/${tableId}`} className="text-brand-700 underline">
          Ver cardápio
        </Link>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await placeTableOrder(slug, tableId, {
        customerName: name,
        notes,
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, notes: i.notes, optionIds: i.optionIds })),
      });
      if (result.ok) {
        try {
          window.localStorage.setItem(NAME_KEY, name.trim());
        } catch {}
        cart.clear();
        router.push(`/lojas/${slug}/mesa/${tableId}/conta?novo=1`);
      } else setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-lg border border-stone-200 bg-white">
        <ul className="divide-y divide-stone-200">
          {cart.items.map((item) => (
            <li key={item.key} className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.optionsLabel && <p className="text-sm text-stone-600">{item.optionsLabel}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <QuantityControl
                    quantity={item.quantity}
                    label={item.name}
                    onChange={(q) => cart.setQuantity(item.key, q)}
                  />
                  <span className="w-20 text-right font-semibold">{formatPrice(item.priceCents * item.quantity)}</span>
                </div>
              </div>
              <input
                type="text"
                placeholder="Observação (ex.: sem cebola)"
                defaultValue={item.notes}
                onBlur={(e) => cart.setNotes(item.key, e.target.value)}
                maxLength={200}
                className={inputClass}
              />
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-stone-200 p-4 font-bold">
          <span>Total deste pedido</span>
          <span>{formatPrice(cart.subtotalCents)}</span>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
        <label className="block text-sm">
          Seu nome
          <input value={name} onChange={(e) => setName(e.target.value)} required className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm">
          Observações para a cozinha
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} className={`${inputClass} mt-1`} />
        </label>
        <p className="text-sm text-stone-500">O valor entra na conta da mesa. Você paga ao pedir para fechar a conta.</p>
      </section>

      {!isOpen && <p className="text-sm text-red-600">A loja está fechada no momento.</p>}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button disabled={pending || !isOpen} className={`${buttonClass} w-full py-3 text-base`}>
        {pending ? "Enviando..." : `Enviar pedido · ${formatPrice(cart.subtotalCents)}`}
      </button>
    </form>
  );
}
