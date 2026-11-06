"use client";

import { useActionState } from "react";
import { createStore } from "./actions";
import { submitKeepingValues } from "@/lib/form";
import { buttonClass, inputClass } from "@/components/ui";

export function NewStoreForm() {
  const [state, action, pending] = useActionState(createStore, undefined);
  return (
    <form onSubmit={submitKeepingValues(action)} className="space-y-4 rounded-lg border border-stone-200 bg-white p-4">
      <label className="block text-sm">
        Nome da loja
        <input name="name" required className={`${inputClass} mt-1`} placeholder="Ex.: Lanchonete do Zé" />
      </label>
      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <label className="block text-sm">
          Cidade
          <input name="city" required className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm">
          UF
          <input name="state" required maxLength={2} className={`${inputClass} mt-1 uppercase`} placeholder="SP" />
        </label>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button disabled={pending} className={`${buttonClass} w-full`}>
        {pending ? "Criando..." : "Criar loja"}
      </button>
    </form>
  );
}
