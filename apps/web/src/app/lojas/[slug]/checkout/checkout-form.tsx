"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrderType, PaymentMethod } from "@cardapio/db";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { ORDER_TYPE_LABEL, PAYMENT_LABEL } from "@/lib/orders";
import { QuantityControl } from "@/components/add-to-cart";
import { placeOrder } from "./actions";

type Props = {
  store: {
    slug: string;
    isOpen: boolean;
    acceptsDelivery: boolean;
    acceptsPickup: boolean;
    acceptsDineIn: boolean;
    deliveryFeeCents: number;
    minOrderCents: number;
  };
  defaults: { name: string; phone: string };
};

const input = "w-full rounded-md border border-stone-300 bg-white px-3 py-2";

export function CheckoutForm({ store, defaults }: Props) {
  const router = useRouter();
  const cart = useCart(store.slug);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const types = (["DELIVERY", "PICKUP", "DINE_IN"] as OrderType[]).filter(
    (t) =>
      (t === "DELIVERY" && store.acceptsDelivery) ||
      (t === "PICKUP" && store.acceptsPickup) ||
      (t === "DINE_IN" && store.acceptsDineIn),
  );
  const [type, setType] = useState<OrderType>(types[0] ?? "PICKUP");
  const [payment, setPayment] = useState<PaymentMethod>("PIX");

  if (!cart.loaded) return null;

  if (cart.count === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-stone-500">
        Seu carrinho está vazio.{" "}
        <Link href={`/lojas/${store.slug}`} className="text-brand-700 underline">
          Escolher itens
        </Link>
      </div>
    );
  }

  const deliveryFee = type === "DELIVERY" ? store.deliveryFeeCents : 0;
  const total = cart.subtotalCents + deliveryFee;
  const belowMinimum = cart.subtotalCents < store.minOrderCents;

  function submit(form: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await placeOrder({
        storeSlug: store.slug,
        type,
        paymentMethod: payment,
        customerName: String(form.get("name") ?? ""),
        customerPhone: String(form.get("phone") ?? ""),
        deliveryAddress: String(form.get("address") ?? ""),
        notes: String(form.get("notes") ?? ""),
        changeFor: String(form.get("changeFor") ?? ""),
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, notes: i.notes })),
      });
      if (result.ok) {
        cart.clear();
        router.push(`/pedidos/${result.orderId}?novo=1`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={submit} className="space-y-6">
      <section className="rounded-lg border border-stone-200 bg-white">
        <h2 className="border-b border-stone-200 px-4 py-3 font-semibold">Seu pedido</h2>
        <ul className="divide-y divide-stone-200">
          {cart.items.map((item) => (
            <li key={item.productId} className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-stone-500">{formatPrice(item.priceCents)} cada</p>
                </div>
                <div className="flex items-center gap-3">
                  <QuantityControl
                    quantity={item.quantity}
                    label={item.name}
                    onChange={(q) => cart.setQuantity(item.productId, q)}
                  />
                  <span className="w-20 text-right font-semibold">{formatPrice(item.priceCents * item.quantity)}</span>
                </div>
              </div>
              <input
                type="text"
                placeholder="Observação (ex.: sem cebola)"
                defaultValue={item.notes}
                onBlur={(e) => cart.setNotes(item.productId, e.target.value)}
                maxLength={200}
                className={`${input} text-sm`}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Como você quer receber?</h2>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${type === t ? "border-brand-600 bg-brand-50 font-medium" : "border-stone-300"}`}
            >
              <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
              {ORDER_TYPE_LABEL[t]}
              {t === "DELIVERY" && ` (${store.deliveryFeeCents ? formatPrice(store.deliveryFeeCents) : "grátis"})`}
            </label>
          ))}
        </div>
        {type === "DELIVERY" && (
          <label className="block text-sm">
            Endereço de entrega
            <textarea name="address" required rows={2} placeholder="Rua, número, bairro, complemento" className={`${input} mt-1`} />
          </label>
        )}
      </section>

      <section className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Seus dados</h2>
        <label className="block text-sm">
          Nome
          <input name="name" required defaultValue={defaults.name} autoComplete="name" className={`${input} mt-1`} />
        </label>
        <label className="block text-sm">
          Telefone / WhatsApp
          <input
            name="phone"
            required
            type="tel"
            inputMode="tel"
            defaultValue={defaults.phone}
            placeholder="(11) 91234-5678"
            autoComplete="tel"
            className={`${input} mt-1`}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          Observações para a loja
          <input name="notes" maxLength={500} className={`${input} mt-1`} />
        </label>
      </section>

      <section className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Pagamento</h2>
        <p className="text-sm text-stone-500">O pagamento é feito diretamente com a loja, na entrega ou retirada.</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((p) => (
            <label
              key={p}
              className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${payment === p ? "border-brand-600 bg-brand-50 font-medium" : "border-stone-300"}`}
            >
              <input type="radio" name="payment" value={p} checked={payment === p} onChange={() => setPayment(p)} className="sr-only" />
              {PAYMENT_LABEL[p]}
            </label>
          ))}
        </div>
        {payment === "CASH" && (
          <label className="block text-sm">
            Troco para quanto? (deixe vazio se não precisar)
            <input name="changeFor" inputMode="decimal" placeholder="Ex.: 50,00" className={`${input} mt-1 max-w-40`} />
          </label>
        )}
      </section>

      <section className="space-y-1 rounded-lg border border-stone-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatPrice(cart.subtotalCents)}</span>
        </div>
        {type === "DELIVERY" && (
          <div className="flex justify-between">
            <span>Taxa de entrega</span>
            <span>{deliveryFee ? formatPrice(deliveryFee) : "Grátis"}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </section>

      {belowMinimum && (
        <p className="text-sm text-amber-700">O pedido mínimo desta loja é {formatPrice(store.minOrderCents)}.</p>
      )}
      {!store.isOpen && <p className="text-sm text-red-600">A loja está fechada no momento.</p>}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        disabled={pending || !store.isOpen || belowMinimum}
        className="w-full rounded-md bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Enviando pedido..." : `Fazer pedido · ${formatPrice(total)}`}
      </button>
    </form>
  );
}
