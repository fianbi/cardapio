"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitKeepingValues } from "@/lib/form";
import { buttonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import { saveIngredient, setRecipeItem, type FormState } from "./actions";

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
    <form ref={ref} onSubmit={submitKeepingValues(action)} className="flex flex-wrap items-end gap-2">
      <label className="block min-w-48 flex-1 text-sm">
        Ingrediente
        <input name="name" required placeholder="Ex.: Queijo mussarela" className={`${inputClass} mt-1`} />
      </label>
      <button disabled={pending} className={buttonClass}>
        Adicionar
      </button>
      <div className="w-full">
        <Feedback state={state} okText="Ingrediente adicionado!" />
      </div>
    </form>
  );
}

export function EditIngredientForm({ storeId, ingredient }: { storeId: string; ingredient: { id: string; name: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveIngredient.bind(null, storeId, ingredient.id),
    undefined,
  );
  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-wrap items-end gap-2">
      <label className="block min-w-48 flex-1 text-sm">
        Nome
        <input name="name" defaultValue={ingredient.name} required className={`${inputClass} mt-1`} />
      </label>
      <button disabled={pending} className={secondaryButtonClass}>
        Salvar
      </button>
      <div className="w-full">
        <Feedback state={state} />
      </div>
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
  ingredients: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(setRecipeItem.bind(null, storeId, productId), undefined);
  const ref = useResetOnOk(state);
  if (ingredients.length === 0) {
    return <p className="text-sm text-stone-500">Cadastre ingredientes na aba Ingredientes para ligar ao produto.</p>;
  }
  return (
    <form ref={ref} onSubmit={submitKeepingValues(action)} className="flex flex-wrap items-end gap-2">
      <label className="text-sm">
        Ingrediente
        <select name="ingredientId" className={`${inputClass} mt-1`} aria-label="Ingrediente do produto">
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </label>
      <button disabled={pending} className={secondaryButtonClass}>
        Adicionar ao produto
      </button>
      <Feedback state={state} />
    </form>
  );
}
