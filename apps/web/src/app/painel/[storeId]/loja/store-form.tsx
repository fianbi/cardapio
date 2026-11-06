"use client";

import { useActionState } from "react";
import { saveStore, setPublished, type FormState } from "./actions";
import { submitKeepingValues } from "@/lib/form";
import { weekdayName } from "@/lib/hours";
import { buttonClass, inputClass, secondaryButtonClass } from "@/components/ui";

type Hour = { weekday: number; opensAt: string; closesAt: string };

type Props = {
  storeId: string;
  isActive: boolean;
  values: {
    name: string;
    description: string;
    phone: string;
    whatsapp: string;
    cuisines: string;
    street: string;
    number: string;
    district: string;
    zipCode: string;
    city: string;
    state: string;
    acceptsDelivery: boolean;
    acceptsPickup: boolean;
    acceptsDineIn: boolean;
    deliveryFee: string;
    minOrder: string;
  };
  hours: Hour[];
};

const field = (label: string, name: string, value: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
  <label className="block text-sm">
    {label}
    <input name={name} defaultValue={value} className={`${inputClass} mt-1`} {...extra} />
  </label>
);

export function PublishToggle({ storeId, isActive }: { storeId: string; isActive: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    () => setPublished(storeId, !isActive),
    undefined,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button disabled={pending} className={isActive ? secondaryButtonClass : buttonClass}>
        {isActive ? "Despublicar loja" : "Publicar loja"}
      </button>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function StoreForm({ storeId, values: v, hours }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveStore.bind(null, storeId), undefined);
  const byDay = new Map(hours.map((h) => [h.weekday, h]));

  return (
    <form onSubmit={submitKeepingValues(action)} className="space-y-6">
      <section className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Informações</h2>
        {field("Nome", "name", v.name, { required: true })}
        {field("Tipos de comida (separados por vírgula)", "cuisines", v.cuisines, { placeholder: "lanches, pizza, açaí" })}
        <label className="block text-sm sm:col-span-2">
          Descrição
          <textarea name="description" rows={2} defaultValue={v.description} className={`${inputClass} mt-1`} />
        </label>
        {field("Telefone", "phone", v.phone, { type: "tel" })}
        {field("WhatsApp de contato", "whatsapp", v.whatsapp, { type: "tel", placeholder: "5511999999999" })}
      </section>

      <section className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-6">
        <h2 className="font-semibold sm:col-span-6">Endereço</h2>
        <div className="sm:col-span-4">{field("Rua", "street", v.street)}</div>
        <div className="sm:col-span-2">{field("Número", "number", v.number)}</div>
        <div className="sm:col-span-3">{field("Bairro", "district", v.district)}</div>
        <div className="sm:col-span-3">{field("CEP", "zipCode", v.zipCode)}</div>
        <div className="sm:col-span-5">{field("Cidade", "city", v.city, { required: true })}</div>
        <div className="sm:col-span-1">{field("UF", "state", v.state, { required: true, maxLength: 2 })}</div>
      </section>

      <section className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Atendimento</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {[
            ["acceptsDelivery", "Entrega", v.acceptsDelivery],
            ["acceptsPickup", "Retirada no local", v.acceptsPickup],
            ["acceptsDineIn", "Consumo no local", v.acceptsDineIn],
          ].map(([name, label, checked]) => (
            <label key={name as string} className="flex items-center gap-2">
              <input type="checkbox" name={name as string} defaultChecked={checked as boolean} />
              {label as string}
            </label>
          ))}
        </div>
        <div className="grid max-w-md grid-cols-2 gap-3">
          {field("Taxa de entrega (R$)", "deliveryFee", v.deliveryFee, { inputMode: "decimal", placeholder: "0,00" })}
          {field("Pedido mínimo (R$)", "minOrder", v.minOrder, { inputMode: "decimal", placeholder: "0,00" })}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Horário de funcionamento</h2>
        <p className="text-sm text-stone-500">Se fechar depois da meia-noite, coloque o horário do dia seguinte (ex.: 18:00 às 02:00).</p>
        <ul className="space-y-2">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => {
            const h = byDay.get(d);
            return (
              <li key={d} className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex w-28 items-center gap-2">
                  <input type="checkbox" name={`open-${d}`} defaultChecked={!!h} />
                  {weekdayName(d)}
                </label>
                <input
                  type="time"
                  name={`opensAt-${d}`}
                  defaultValue={h?.opensAt ?? "18:00"}
                  aria-label={`Abre ${weekdayName(d)}`}
                  className="rounded-md border border-stone-300 px-2 py-1"
                />
                <span>às</span>
                <input
                  type="time"
                  name={`closesAt-${d}`}
                  defaultValue={h?.closesAt ?? "23:00"}
                  aria-label={`Fecha ${weekdayName(d)}`}
                  className="rounded-md border border-stone-300 px-2 py-1"
                />
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex items-center gap-3">
        <button disabled={pending} className={buttonClass}>
          {pending ? "Salvando..." : "Salvar"}
        </button>
        {state?.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state?.ok && <p className="text-sm text-green-700">Alterações salvas!</p>}
      </div>
    </form>
  );
}
