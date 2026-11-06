import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { formatPrice } from "@/lib/format";
import {
  ORDER_STATUS_LABEL,
  ORDER_TYPE_LABEL,
  PAYMENT_LABEL,
  STATUS_ACTION_LABEL,
  nextStatuses,
} from "@/lib/orders";
import { TIMEZONE } from "@/lib/hours";
import { AutoRefresh } from "@/components/auto-refresh";
import { buttonClass, dangerButtonClass } from "@/components/ui";
import { updateOrderStatus } from "./actions";

export const dynamic = "force-dynamic";

const ACTIVE = ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] as const;

function time(d: Date) {
  return d.toLocaleTimeString("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" });
}

export default async function OrdersPanel({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const { store } = await requireStoreOwner(storeId);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [active, recent] = await Promise.all([
    prisma.order.findMany({
      where: { storeId, status: { in: [...ACTIVE] } },
      orderBy: { createdAt: "asc" },
      include: { items: true, tab: { select: { number: true, label: true, table: { select: { label: true } } } } },
    }),
    prisma.order.findMany({
      where: { storeId, status: { in: ["COMPLETED", "CANCELED"] }, updatedAt: { gte: since } },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);
  const ingredients = await prisma.ingredient.findMany({ where: { storeId }, select: { name: true, stockQty: true, minQty: true } });
  const low = ingredients.filter((i) => i.stockQty <= i.minQty);
  const pending = active.filter((o) => o.status === "PENDING");
  const inProgress = active.filter((o) => o.status !== "PENDING");

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={10} />

      {!store.isActive && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sua loja ainda é um rascunho. Complete o cardápio e publique em <strong>Loja e horários</strong> para começar a
          receber pedidos.
        </p>
      )}

      {low.length > 0 && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Estoque baixo: {low.map((i) => i.name).join(", ")}.{" "}
          <a href={`/painel/${storeId}/estoque`} className="font-medium underline">
            Ver estoque
          </a>
        </p>
      )}

      {[
        { title: `Novos pedidos (${pending.length})`, orders: pending, empty: "Nenhum pedido novo." },
        { title: `Em andamento (${inProgress.length})`, orders: inProgress, empty: "Nada em andamento." },
      ].map((group) => (
        <section key={group.title} className="space-y-3">
          <h2 className="text-lg font-semibold">{group.title}</h2>
          {group.orders.length === 0 ? (
            <p className="text-sm text-stone-500">{group.empty}</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {group.orders.map((o) => (
                <li
                  key={o.id}
                  className={`space-y-3 rounded-lg border bg-white p-4 ${o.status === "PENDING" ? "border-brand-500 ring-2 ring-brand-100" : "border-stone-200"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold">#{o.number}</p>
                      <p className="text-sm text-stone-500">
                        {time(o.createdAt)} ·{" "}
                        {o.tab ? (
                          <strong className="text-stone-800">
                            {o.tab.table?.label ?? o.tab.label ?? "Balcão"} (comanda #{o.tab.number})
                          </strong>
                        ) : (
                          ORDER_TYPE_LABEL[o.type]
                        )}
                      </p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium">
                      {ORDER_STATUS_LABEL[o.status]}
                    </span>
                  </div>
                  <ul className="text-sm">
                    {o.items.map((i) => (
                      <li key={i.id}>
                        <strong>{i.quantity}x</strong> {i.productName}
                        {i.notes && <span className="text-stone-500"> · {i.notes}</span>}
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-0.5 text-sm text-stone-600">
                    <p>
                      {o.customerName}
                      {o.customerPhone && ` · ${o.customerPhone}`}
                    </p>
                    {o.deliveryAddress && <p>📍 {o.deliveryAddress}</p>}
                    {o.notes && <p>Obs.: {o.notes}</p>}
                    <p className="font-semibold text-stone-900">
                      {formatPrice(o.totalCents)} · {o.paymentMethod ? PAYMENT_LABEL[o.paymentMethod] : "Na comanda"}
                      {o.changeForCents ? ` (troco para ${formatPrice(o.changeForCents)})` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses(o.status, o.type).map((next) => (
                      <form key={next} action={updateOrderStatus.bind(null, storeId, o.id, next)}>
                        <button className={next === "CANCELED" ? dangerButtonClass : buttonClass}>
                          {o.status === "PENDING" && next === "CANCELED" ? "Recusar" : STATUS_ACTION_LABEL[next]}
                        </button>
                      </form>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Finalizados nas últimas 24h</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum ainda.</p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white text-sm">
            {recent.map((o) => (
              <li key={o.id} className="flex justify-between p-3">
                <span>
                  #{o.number} · {o.customerName} · {time(o.createdAt)}
                </span>
                <span className={o.status === "CANCELED" ? "text-red-600" : "text-green-700"}>
                  {ORDER_STATUS_LABEL[o.status]} · {formatPrice(o.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
