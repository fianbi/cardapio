import { formatPrice } from "@/lib/format";
import { groupHint } from "@/lib/options";
import { buttonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import {
  addOption,
  addOptionGroup,
  deleteOption,
  deleteOptionGroup,
  toggleOptionAvailability,
  updateOptionGroup,
} from "./actions";

type Group = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: { id: string; name: string; priceCents: number; isAvailable: boolean }[];
};

const small = `${inputClass} w-auto`;

/** Adicionais e opções de um produto (ex.: "Ponto da carne", "Adicionais", "Tamanho"). */
export function OptionGroups({ storeId, productId, groups }: { storeId: string; productId: string; groups: Group[] }) {
  return (
    <div className="space-y-3 rounded-md bg-stone-50 p-3">
      <div>
        <p className="text-sm font-medium">Adicionais e opções</p>
        <p className="text-xs text-stone-500">
          Crie grupos como “Ponto da carne” (obrigatório, escolha 1) ou “Adicionais” (opcional, até 5). O valor de cada
          opção é somado ao preço do produto.
        </p>
      </div>

      {groups.map((g) => (
        <div key={g.id} className="space-y-2 rounded-md border border-stone-200 bg-white p-3">
          <form action={updateOptionGroup.bind(null, storeId, g.id)} className="flex flex-wrap items-center gap-2 text-sm">
            <input name="name" defaultValue={g.name} required aria-label="Nome do grupo" className={`${small} font-medium`} />
            <label className="flex items-center gap-1">
              <input type="checkbox" name="required" defaultChecked={g.minSelect > 0} /> Obrigatório
            </label>
            <label className="flex items-center gap-1">
              Máx.
              <input name="maxSelect" type="number" min={1} max={20} defaultValue={g.maxSelect} className={`${small} w-16`} />
            </label>
            <button className="text-xs text-brand-700 hover:underline">Salvar grupo</button>
            <span className="text-xs text-stone-500">{groupHint(g)}</span>
          </form>

          {g.options.length > 0 && (
            <ul className="divide-y divide-stone-100 text-sm">
              {g.options.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 py-1">
                  <span className={`flex-1 ${o.isAvailable ? "" : "text-red-700 line-through"}`}>{o.name}</span>
                  <span className="text-stone-600">{o.priceCents > 0 ? `+ ${formatPrice(o.priceCents)}` : "sem custo"}</span>
                  <form action={toggleOptionAvailability.bind(null, storeId, o.id)}>
                    <button className="text-xs text-brand-700 hover:underline">{o.isAvailable ? "marcar em falta" : "voltou a ter"}</button>
                  </form>
                  <form action={deleteOption.bind(null, storeId, o.id)}>
                    <button className="text-xs text-red-700 hover:underline" aria-label={`Excluir opção ${o.name}`}>
                      excluir
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={addOption.bind(null, storeId, g.id)} className="flex flex-wrap items-center gap-2">
            <input name="name" required placeholder="Opção (ex.: Bacon)" className={`${small} flex-1`} />
            <input name="price" inputMode="decimal" placeholder="Valor (ex.: 4,00)" className={`${small} w-36`} />
            <button className={secondaryButtonClass}>Adicionar opção</button>
          </form>

          <form action={deleteOptionGroup.bind(null, storeId, g.id)}>
            <button className="text-xs text-red-700 hover:underline">Excluir grupo “{g.name}”</button>
          </form>
        </div>
      ))}

      <form action={addOptionGroup.bind(null, storeId, productId)} className="flex flex-wrap items-center gap-2 text-sm">
        <input name="name" required placeholder="Novo grupo (ex.: Adicionais)" className={`${small} flex-1`} />
        <label className="flex items-center gap-1">
          <input type="checkbox" name="required" /> Obrigatório
        </label>
        <label className="flex items-center gap-1">
          Máx.
          <input name="maxSelect" type="number" min={1} max={20} defaultValue={1} className={`${small} w-16`} />
        </label>
        <button className={buttonClass}>Criar grupo</button>
      </form>
    </div>
  );
}
