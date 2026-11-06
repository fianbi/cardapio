"use client";

import { useActionState, useState } from "react";
import type { PaymentMethod } from "@cardapio/db";
import { formatPrice, parsePriceToCents } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/orders";
import { submitKeepingValues } from "@/lib/form";
import { buttonClass, inputClass } from "@/components/ui";
import { closeTab, type ActionResult } from "../actions";

type Props = { storeId: string; tabId: string; subtotalCents: number; serviceFeePercent: number };

export function CloseTab({ storeId, tabId, subtotalCents, serviceFeePercent }: Props) {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    closeTab.bind(null, storeId, tabId),
    undefined,
  );
  const [withFee, setWithFee] = useState(serviceFeePercent > 0);
  const [discount, setDiscount] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("PIX");

  const fee = withFee ? Math.round((subtotalCents * serviceFeePercent) / 100) : 0;
  const discountCents = parsePriceToCents(discount) ?? 0;
  const total = subtotalCents + fee - discountCents;

  return (
    <form onSubmit={submitKeepingValues(action)} className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="font-semibold">Fechar conta</h2>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Consumo</span>
          <span>{formatPrice(subtotalCents)}</span>
        </div>
        {serviceFeePercent > 0 && (
          <label className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <input type="checkbox" name="serviceFee" checked={withFee} onChange={(e) => setWithFee(e.target.checked)} />
              Taxa de serviço ({serviceFeePercent}%)
            </span>
            <span>{formatPrice(fee)}</span>
          </label>
        )}
        <label className="flex items-center justify-between gap-3">
          <span>Desconto (R$)</span>
          <input
            name="discount"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className={`${inputClass} !w-28 text-right`}
          />
        </label>
        <div className="flex justify-between pt-2 text-lg font-bold">
          <span>Total</span>
          <span>{formatPrice(Math.max(total, 0))}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((p) => (
          <label
            key={p}
            className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${payment === p ? "border-brand-600 bg-brand-50 font-medium" : "border-stone-300"}`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={p}
              checked={payment === p}
              onChange={() => setPayment(p)}
              className="sr-only"
            />
            {PAYMENT_LABEL[p]}
          </label>
        ))}
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button disabled={pending || subtotalCents === 0} className={`${buttonClass} w-full`}>
        {pending ? "Fechando..." : `Fechar conta · ${formatPrice(Math.max(total, 0))}`}
      </button>
    </form>
  );
}
