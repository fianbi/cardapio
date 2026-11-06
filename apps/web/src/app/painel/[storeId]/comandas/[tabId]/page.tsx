import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/orders";
import { tabSubtotal } from "@/lib/server/tabs";
import { TIMEZONE } from "@/lib/hours";
import { AutoRefresh } from "@/components/auto-refresh";
import { secondaryButtonClass, inputClass, dangerButtonClass } from "@/components/ui";
import { PrintButton } from "../../mesas/print-button";
import { cancelTab, cancelTabOrder, renameTab } from "../actions";
import { updateOrderStatus } from "../../actions";
import { AddItems } from "./add-items";
import { CloseTab } from "./close-tab";

export const dynamic = "force-dynamic";

const time = (d: Date) => d.toLocaleTimeString("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" });

export default async function TabPage({ params }: { params: Promise<{ storeId: string; tabId: string }> }) {
  const { storeId, tabId } = await params;
  const { store } = await requireStoreOwner(storeId);

  const tab = await prisma.tab.findFirst({
    where: { id: tabId, storeId },
    include: {
      table: true,
      orders: { orderBy: { createdAt: "asc" }, include: { items: true } },
    },
  });
  if (!tab) notFound();

  const open = tab.status === "OPEN";
  const subtotal = tabSubtotal(tab.orders);
  const products = open
    ? await prisma.product.findMany({
        where: { storeId, isAvailable: true },
        orderBy: [{ category: { position: "asc" } }, { position: "asc" }],
        select: { id: true, name: true, priceCents: true, category: { select: { name: true } } },
      })
    : [];

  const title = tab.table ? tab.table.label : tab.label || "Comanda avulsa";

  return (
    <div className="space-y-6">
      {open && <AutoRefresh seconds={15} />}
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <Link href={`/painel/${storeId}/comandas`} className="text-sm text-brand-700 hover:underline">
            ← Comandas
          </Link>
          <h2 className="text-xl font-bold">
            {title} · Comanda #{tab.number}
          </h2>
          <p className="text-sm text-stone-500">
            Aberta às {time(tab.createdAt)}
            {tab.status === "CLOSED" && tab.closedAt && ` · Fechada às ${time(tab.closedAt)}`}
            {tab.status === "CANCELED" && " · Cancelada"}
          </p>
        </div>
        {open && tab.table && (
          <form action={renameTab.bind(null, storeId, tab.id)} className="flex gap-2">
            <input name="label" defaultValue={tab.label ?? ""} placeholder="Nome do cliente" className={`${inputClass} w-44`} />
            <button className={secondaryButtonClass}>Salvar</button>
          </form>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="space-y-3">
          {/* Conta (também usada na impressão) */}
          <div className="rounded-lg border border-stone-200 bg-white">
            <div className="hidden p-4 text-center print:block">
              <p className="font-bold">{store.name}</p>
              <p className="text-sm">
                {title} · Comanda #{tab.number}
              </p>
            </div>
            {tab.orders.length === 0 ? (
              <p className="p-4 text-sm text-stone-500">Nenhum item lançado ainda.</p>
            ) : (
              <ul className="divide-y divide-stone-200">
                {tab.orders.map((o) => (
                  <li key={o.id} className={`p-4 ${o.status === "CANCELED" ? "opacity-50 print:hidden" : ""}`}>
                    <div className="flex items-center justify-between gap-2 text-xs text-stone-500 print:hidden">
                      <span>
                        Pedido #{o.number} · {time(o.createdAt)} · {o.customerName} ·{" "}
                        <strong>{ORDER_STATUS_LABEL[o.status]}</strong>
                      </span>
                      <span className="flex gap-2">
                        {o.status === "PENDING" && open && (
                          <form action={updateOrderStatus.bind(null, storeId, o.id, "CONFIRMED")}>
                            <button className="font-medium text-brand-700 hover:underline">Aceitar</button>
                          </form>
                        )}
                        {open && o.status !== "COMPLETED" && o.status !== "CANCELED" && (
                          <form action={cancelTabOrder.bind(null, storeId, tab.id, o.id)}>
                            <button className="text-red-700 hover:underline">Cancelar</button>
                          </form>
                        )}
                      </span>
                    </div>
                    <ul className="mt-1 text-sm">
                      {o.items.map((i) => (
                        <li key={i.id} className="flex justify-between gap-3">
                          <span>
                            {i.quantity}x {i.productName}
                            {i.notes && <span className="text-stone-500"> · {i.notes}</span>}
                          </span>
                          <span>{formatPrice(i.unitPriceCents * i.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                    {o.notes && <p className="text-xs text-stone-500">Obs.: {o.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
            <div className="space-y-1 border-t border-stone-200 p-4 text-sm">
              <div className="flex justify-between font-semibold">
                <span>Consumo</span>
                <span>{formatPrice(tab.subtotalCents ?? subtotal)}</span>
              </div>
              {tab.status === "CLOSED" && (
                <>
                  {!!tab.serviceFeeCents && (
                    <div className="flex justify-between">
                      <span>Taxa de serviço</span>
                      <span>{formatPrice(tab.serviceFeeCents)}</span>
                    </div>
                  )}
                  {!!tab.discountCents && (
                    <div className="flex justify-between">
                      <span>Desconto</span>
                      <span>− {formatPrice(tab.discountCents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total pago</span>
                    <span>{formatPrice(tab.totalCents ?? 0)}</span>
                  </div>
                  {tab.paymentMethod && <p className="text-stone-600">Pagamento: {PAYMENT_LABEL[tab.paymentMethod]}</p>}
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <PrintButton label={open ? "Imprimir parcial" : "Imprimir conta"} />
            {open && subtotal === 0 && (
              <form action={cancelTab.bind(null, storeId, tab.id)}>
                <button className={dangerButtonClass}>Cancelar comanda</button>
              </form>
            )}
          </div>
        </section>

        {open && (
          <aside className="space-y-6 print:hidden">
            <AddItems
              storeId={storeId}
              tabId={tab.id}
              products={products.map((p) => ({
                id: p.id,
                name: p.name,
                priceCents: p.priceCents,
                category: p.category?.name ?? "Outros",
              }))}
            />
            <CloseTab
              storeId={storeId}
              tabId={tab.id}
              subtotalCents={subtotal}
              serviceFeePercent={store.serviceFeePercent}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
