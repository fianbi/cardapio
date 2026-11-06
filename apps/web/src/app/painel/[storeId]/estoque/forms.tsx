"use client";

import { useActionState, useEffect, useRef } from "react";
import type { IngredientUnit } from "@cardapio/db";
import { UNIT_LABEL, UNIT_SHORT } from "@/lib/units";
import { submitKeepingValues } from "@/lib/form";
import { buttonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import { moveStock, saveIngredient, setRecipeItem, type FormState } from "./actions";

function Feedback({ state, okText = "Salvo!" }: { state: FormState; okText?: string }) {
  if (state?.error)
    return (
      <p role="alert" className="text-sm text-red-700">
        {state.error}
      </p>
    );
  if (state?.ok) return <p className="text-sm text-green-700">{okText}</p>;
  return null;
}

/** Limpa o formulário depois de um envio com sucesso. */
function useResetOnOk(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function NewIngredientForm({ storeId }: { storeId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveIngredient.bind(null, storeId, null), undefined);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} onSubmit={submitKeepingValues(action)} className="grid gap-3 sm:grid-cols-[2fr_1.3fr_1fr_1fr_auto] sm:items-end">
      <label className="block text-sm">
        Ingrediente
        <input name="name" required placeholder="Ex.: Queijo mussarela" className={`${inputClass} mt-1`} />
      </label>
      <label className="block text-sm">
        Unidade
        <select name="unit" defaultValue="GRAM" className={`${inputClass} mt-1`}>
          {(Object.keys(UNIT_LABEL) as IngredientUnit[]).map((u) => (
            <option key={u} value={u}>
              {UNIT_LABEL[u]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Estoque atual
        <input name="stockQty" inputMode="numeric" placeholder="0" className={`${inputClass} mt-1`} />
      </label>
      <label className="block text-sm">
        Alerta abaixo de
        <input name="minQty" inputMode="numeric" placeholder="0" className={`${inputClass} mt-1`} />
      </label>
      <button disabled={pending} className={buttonClass}>
        Adicionar
      </button>
      <div className="sm:col-span-5">
        <Feedback state={state} okText="Ingrediente adicionado!" />
      </div>
    </form>
  );
}

export function EditIngredientForm({
  storeId,
  ingredient,
}: {
  storeId: string;
  ingredient: { id: string; name: string; unit: IngredientUnit; minQty: number };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveIngredient.bind(null, storeId, ingredient.id),
    undefined,
  );
  return (
    <form onSubmit={submitKeepingValues(action)} className="grid gap-2 sm:grid-cols-[2fr_1.3fr_1fr_auto] sm:items-end">
      <label className="block text-sm">
        Nome
        <input name="name" defaultValue={ingredient.name} required className={`${inputClass} mt-1`} />
      </label>
      <label className="block text-sm">
        Unidade
        <select name="unit" defaultValue={ingredient.unit} className={`${inputClass} mt-1`}>
          {(Object.keys(UNIT_LABEL) as IngredientUnit[]).map((u) => (
            <option key={u} value={u}>
              {UNIT_LABEL[u]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Alerta abaixo de
        <input name="minQty" defaultValue={ingredient.minQty} inputMode="numeric" className={`${inputClass} mt-1`} />
      </label>
      <button disabled={pending} className={secondaryButtonClass}>
        Salvar
      </button>
      <div className="sm:col-span-4">
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function MoveStockForm({ storeId, ingredientId, unit }: { storeId: string; ingredientId: string; unit: IngredientUnit }) {
  const [state, action, pending] = useActionState<FormState, FormData>(moveStock.bind(null, storeId, ingredientId), undefined);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} onSubmit={submitKeepingValues(action)} className="flex flex-wrap items-end gap-2">
      <label className="text-sm">
        Movimentação
        <select name="kind" defaultValue="PURCHASE" className={`${inputClass} mt-1`}>
          <option value="PURCHASE">Entrada (compra)</option>
          <option value="LOSS">Perda / quebra</option>
          <option value="COUNT">Contagem (definir saldo)</option>
        </select>
      </label>
      <label className="text-sm">
        Quantidade ({UNIT_SHORT[unit]})
        <input name="qty" required inputMode="numeric" className={`${inputClass} mt-1 !w-28`} aria-label="Quantidade" />
      </label>
      <label className="text-sm">
        Observação
        <input name="note" placeholder="opcional" className={`${inputClass} mt-1 !w-40`} />
      </label>
      <button disabled={pending} className={buttonClass}>
        Registrar
      </button>
      <Feedback state={state} okText="Registrado!" />
    </form>
  );
}

export function RecipeItemForm({
  storeId,
  productId,
  ingredients,
}: {
  storeId: string;
  productId: string;
  ingredients: { id: string; name: string; unit: IngredientUnit }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(setRecipeItem.bind(null, storeId, productId), undefined);
  const ref = useResetOnOk(state);
  if (ingredients.length === 0) {
    return <p className="text-sm text-stone-500">Cadastre ingredientes na aba Estoque para montar a ficha técnica.</p>;
  }
  return (
    <form ref={ref} onSubmit={submitKeepingValues(action)} className="flex flex-wrap items-end gap-2">
      <label className="text-sm">
        Ingrediente
        <select name="ingredientId" className={`${inputClass} mt-1`} aria-label="Ingrediente da ficha">
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({UNIT_SHORT[i.unit]})
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Qtd. por unidade
        <input name="quantity" required inputMode="numeric" className={`${inputClass} mt-1 !w-24`} aria-label="Quantidade na ficha" />
      </label>
      <button disabled={pending} className={secondaryButtonClass}>
        Adicionar à ficha
      </button>
      <Feedback state={state} />
    </form>
  );
}
