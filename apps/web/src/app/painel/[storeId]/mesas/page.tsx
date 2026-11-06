import QRCode from "qrcode";
import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { siteUrl } from "@/lib/server/url";
import { buttonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import { addTables, renameTable, toggleTable } from "./actions";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function TablesPanel({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const { store } = await requireStoreOwner(storeId);
  const [tables, base] = await Promise.all([
    prisma.diningTable.findMany({ where: { storeId }, orderBy: { position: "asc" } }),
    siteUrl(),
  ]);

  const withQr = await Promise.all(
    tables.map(async (t) => {
      const url = `${base}/lojas/${store.slug}/mesa/${t.id}`;
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 160 });
      return { ...t, url, svg };
    }),
  );

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-lg border border-stone-200 bg-white p-4 print:hidden">
        <h2 className="font-semibold">Adicionar mesas</h2>
        <p className="text-sm text-stone-500">
          Cada mesa ganha um QR code. O cliente aponta a câmera, vê o cardápio e faz o pedido direto na comanda da mesa.
        </p>
        <form action={addTables.bind(null, storeId)} className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            Nome
            <input name="label" defaultValue="Mesa" className={`${inputClass} mt-1 w-40`} />
          </label>
          <label className="text-sm">
            Quantidade
            <input name="quantity" type="number" min={1} max={50} defaultValue={1} className={`${inputClass} mt-1 w-24`} />
          </label>
          <button className={buttonClass}>Adicionar</button>
        </form>
        {!store.acceptsDineIn && (
          <p className="text-sm text-amber-700">
            Dica: ative &quot;Consumo no local&quot; em Loja e horários para os clientes verem essa opção.
          </p>
        )}
      </section>

      {withQr.length > 0 && (
        <div className="flex justify-end print:hidden">
          <PrintButton />
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
        {withQr.map((t) => (
          <li
            key={t.id}
            className={`space-y-2 rounded-lg border border-stone-200 bg-white p-4 text-center print:break-inside-avoid ${t.isActive ? "" : "opacity-50 print:hidden"}`}
          >
            <p className="text-lg font-bold">{t.label}</p>
            <div className="mx-auto w-40" dangerouslySetInnerHTML={{ __html: t.svg }} />
            <p className="text-xs text-stone-500">{store.name} · Aponte a câmera para pedir</p>
            <div className="space-y-2 print:hidden">
              <form action={renameTable.bind(null, storeId, t.id)} className="flex gap-2">
                <input name="label" defaultValue={t.label} aria-label="Nome da mesa" className={inputClass} />
                <button className={secondaryButtonClass}>Salvar</button>
              </form>
              <div className="flex justify-between text-sm">
                <a href={t.url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                  Abrir link
                </a>
                <form action={toggleTable.bind(null, storeId, t.id)}>
                  <button className="text-stone-600 hover:underline">{t.isActive ? "Desativar" : "Reativar"}</button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
