"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveProduct, type FormState } from "./actions";
import { submitKeepingValues } from "@/lib/form";
import { buttonClass, inputClass } from "@/components/ui";

type Props = {
  storeId: string;
  categories: { id: string; name: string }[];
  defaultCategoryId: string;
  product?: { id: string; name: string; description: string | null; imageUrl: string | null; price: string };
};

export function ProductForm({ storeId, categories, defaultCategoryId, product }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveProduct.bind(null, storeId, product?.id ?? null),
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Limpa o formulário de "novo produto" depois de salvar.
  useEffect(() => {
    if (state?.ok && !product) formRef.current?.reset();
  }, [state, product]);

  return (
    <form ref={formRef} onSubmit={submitKeepingValues(action)} className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        Nome
        <input name="name" required defaultValue={product?.name} className={`${inputClass} mt-1`} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          Preço (R$)
          <input
            name="price"
            required
            inputMode="decimal"
            placeholder="22,50"
            defaultValue={product?.price}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm">
          Categoria
          <select name="categoryId" defaultValue={defaultCategoryId} className={`${inputClass} mt-1`}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm sm:col-span-2">
        Descrição
        <textarea
          name="description"
          rows={2}
          defaultValue={product?.description ?? ""}
          placeholder="Ingredientes, tamanho, acompanhamentos..."
          className={`${inputClass} mt-1`}
        />
      </label>
      <label className="block text-sm sm:col-span-2">
        Link da foto (opcional)
        <input
          name="imageUrl"
          type="url"
          defaultValue={product?.imageUrl ?? ""}
          placeholder="https://..."
          className={`${inputClass} mt-1`}
        />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={buttonClass}>
          {pending ? "Salvando..." : product ? "Salvar alterações" : "Adicionar produto"}
        </button>
        {state?.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state?.ok && <p className="text-sm text-green-700">Salvo!</p>}
      </div>
    </form>
  );
}
