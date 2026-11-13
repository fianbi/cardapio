import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { formatPrice } from "@/lib/format";
import {
  ORDER_STATUS_LABEL,
  ORDER_TYPE_LABEL,
  PAYMENT_LABEL,
  CANCEL_REASONS,
  ESTIMATE_OPTIONS,
  STATUS_ACTION_LABEL,
  estimatedReadyAt,
  nextStatuses,
} from "@/lib/orders";
import { optionsLabel } from "@/lib/options";
import { NewOrderAlert } from "@/components/new-order-alert";
import { TIMEZONE } from "@/lib/hours";
import { AutoRefresh } from "@/components/auto-refresh";
import { buttonClass, dangerButtonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import { acceptOrder, cancelOrder, setPaused, updateOrderStatus } from "./actions";

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
      include: { items: { include: { options: true } }, tab: { select: { number: true, label: true, table: { select: { label: true } } } } },
    }),
    prisma.order.findMany({
      where: { storeId, status: { in: ["COMPLETED", "CANCELED"] }, updatedAt: { gte: since } },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);
  const missingIngredients = await prisma.ingredient.findMany({
    where: { storeId, available: false },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  const pending = active.filter((o) => o.status === "PENDING");
  const inProgress = active.filter((o) => o.status !== "PENDING");

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={10} />
      <NewOrderAlert pendingIds={pending.map((o) => o.id)} storeName={store.name} />

      {store.isActive && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-md px-4 py-2 text-sm ${store.isPaused ? "bg-red-50 text-red-800" : "bg-stone-100 text-stone-700"}`}
        >
          <span>
            {store.isPaused
              ? "Pedidos pausados: os clientes veem o cardápio, mas não conseguem pedir."
              : "Recebendo pedidos no horário de funcionamento."}
          </span>
          <form action={setPaused.bind(null, storeId, !store.isPaused)}>
            <button className={store.isPaused ? buttonClass : secondaryButtonClass}>
              {store.isPaused ? "Voltar a receber pedidos" : "Pausar pedidos"}
            </button>
          </form>
        </div>
      )}

      {store.approvalStatus === "PENDING" && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sua loja está aguardando a aprovação da plataforma. Você já pode montar o cardápio; ela aparece para os
          clientes assim que for aprovada e publicada.
        </p>
      )}
      {store.approvalStatus === "SUSPENDED" && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          Sua loja foi suspensa pela plataforma e não aparece para os clientes. Entre em contato com o suporte.
        </p>
      )}

      {!store.isActive && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sua loja ainda é um rascunho. Complete o cardápio e publique em <strong>Loja e horários</strong> para começar a
          receber pedidos.
        </p>
      )}

      {missingIngredients.length > 0 && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Em falta: {missingIngredients.map((i) => i.name).join(", ")}.{" "}
          <a href={`/painel/${storeId}/ingredientes`} className="font-medium underline">
            Ver ingredientes
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
                        {i.options.length > 0 && <span className="text-stone-700"> ({optionsLabel(i.options)})</span>}
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
                  {estimatedReadyAt(o) && (
                    <p className="text-sm text-stone-600">Previsão informada ao cliente: {time(estimatedReadyAt(o)!)}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {o.status === "PENDING" ? (
                      <form action={acceptOrder.bind(null, storeId, o.id)} className="flex items-center gap-2">
                        <select name="minutes" defaultValue={30} aria-label="Tempo estimado" className={`${inputClass} w-auto`}>
                          {ESTIMATE_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              {m} min
                            </option>
                          ))}
                        </select>
                        <button className={buttonClass}>Aceitar pedido</button>
                      </form>
                    ) : (
                      nextStatuses(o.status, o.type)
                        .filter((next) => next !== "CANCELED")
                        .map((next) => (
                          <form key={next} action={updateOrderStatus.bind(null, storeId, o.id, next)}>
                            <button className={buttonClass}>{STATUS_ACTION_LABEL[next]}</button>
                          </form>
                        ))
                    )}
                    <a
                      href={`/painel/${storeId}/pedidos/${o.id}/imprimir`}
                      target="_blank"
                      rel="noreferrer"
                      className={secondaryButtonClass}
                    >
                      Imprimir
                    </a>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-sm text-red-700">
                      {o.status === "PENDING" ? "Recusar pedido" : "Cancelar pedido"}
                    </summary>
                    <form action={cancelOrder.bind(null, storeId, o.id)} className="mt-2 flex flex-wrap items-center gap-2">
                      <select name="reason" aria-label="Motivo" className={`${inputClass} w-auto`}>
                        {CANCEL_REASONS.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                      <input name="other" maxLength={200} placeholder="Outro motivo (opcional)" className={`${inputClass} w-auto flex-1`} />
                      <button className={dangerButtonClass}>Confirmar</button>
                    </form>
                  </details>
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
                  {ORDER_STATUS_LABEL[o.status]}
                  {o.cancelReason && ` (${o.cancelReason})`} · {formatPrice(o.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
