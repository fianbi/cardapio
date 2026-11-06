import Link from "next/link";
import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { formatPrice } from "@/lib/format";
import { tabSubtotal } from "@/lib/server/tabs";
import { TIMEZONE } from "@/lib/hours";
import { AutoRefresh } from "@/components/auto-refresh";
import { buttonClass, inputClass } from "@/components/ui";
import { openLooseTab, openTableTab } from "./actions";

export const dynamic = "force-dynamic";

export default async function TabsPanel({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  await requireStoreOwner(storeId);

  const [tables, openTabs, closedToday] = await Promise.all([
    prisma.diningTable.findMany({ where: { storeId, isActive: true }, orderBy: { position: "asc" } }),
    prisma.tab.findMany({
      where: { storeId, status: "OPEN" },
      orderBy: { createdAt: "asc" },
      include: { orders: { select: { status: true, subtotalCents: true } } },
    }),
    prisma.tab.findMany({
      where: { storeId, status: "CLOSED", closedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { closedAt: "desc" },
      include: { table: { select: { label: true } } },
      take: 30,
    }),
  ]);

  const byTable = new Map(openTabs.filter((t) => t.tableId).map((t) => [t.tableId!, t]));
  const loose = openTabs.filter((t) => !t.tableId);
  const pendingIn = (t: (typeof openTabs)[number]) => t.orders.filter((o) => o.status === "PENDING").length;

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={10} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mesas</h2>
          <Link href={`/painel/${storeId}/mesas`} className="text-sm text-brand-700 hover:underline">
            Gerenciar mesas e QR codes
          </Link>
        </div>
        {tables.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nenhuma mesa cadastrada.{" "}
            <Link href={`/painel/${storeId}/mesas`} className="text-brand-700 underline">
              Cadastrar mesas
            </Link>
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {tables.map((table) => {
              const tab = byTable.get(table.id);
              if (tab) {
                const pending = pendingIn(tab);
                return (
                  <li key={table.id}>
                    <Link
                      href={`/painel/${storeId}/comandas/${tab.id}`}
                      className={`block rounded-lg border p-3 text-center ${pending ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-green-600 bg-green-50"}`}
                    >
                      <p className="font-semibold">{table.label}</p>
                      <p className="text-sm">{formatPrice(tabSubtotal(tab.orders))}</p>
                      <p className="text-xs text-stone-600">{pending ? `${pending} pedido(s) novo(s)` : "Ocupada"}</p>
                    </Link>
                  </li>
                );
              }
              return (
                <li key={table.id}>
                  <form action={openTableTab.bind(null, storeId, table.id)}>
                    <button className="w-full rounded-lg border border-dashed border-stone-300 bg-white p-3 text-center hover:bg-stone-50">
                      <p className="font-semibold">{table.label}</p>
                      <p className="text-xs text-stone-500">Livre · abrir comanda</p>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Comandas avulsas (balcão)</h2>
        <form action={openLooseTab.bind(null, storeId)} className="flex max-w-md gap-2">
          <input name="label" placeholder="Nome do cliente (opcional)" className={inputClass} />
          <button className={buttonClass}>Abrir comanda</button>
        </form>
        {loose.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {loose.map((tab) => (
              <li key={tab.id}>
                <Link
                  href={`/painel/${storeId}/comandas/${tab.id}`}
                  className="block rounded-lg border border-green-600 bg-green-50 p-3 text-center"
                >
                  <p className="font-semibold">#{tab.number}</p>
                  <p className="truncate text-sm">{tab.label}</p>
                  <p className="text-sm">{formatPrice(tabSubtotal(tab.orders))}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Fechadas nas últimas 24h</h2>
        {closedToday.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhuma ainda.</p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white text-sm">
            {closedToday.map((tab) => (
              <li key={tab.id}>
                <Link href={`/painel/${storeId}/comandas/${tab.id}`} className="flex justify-between p-3 hover:bg-stone-50">
                  <span>
                    #{tab.number} · {tab.table?.label ?? tab.label}
                    {" · "}
                    {tab.closedAt?.toLocaleTimeString("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="font-medium">{formatPrice(tab.totalCents ?? 0)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
