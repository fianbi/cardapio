import { prisma, type OrderStatus, type Prisma } from "@cardapio/db";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABEL, ORDER_TYPE_LABEL, PAYMENT_LABEL } from "@/lib/orders";
import { optionsLabel } from "@/lib/options";
import { TIMEZONE } from "@/lib/hours";
import { secondaryButtonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; loja?: string; q?: string }> }) {
  const { status = "", loja = "", q = "" } = await searchParams;
  const where: Prisma.OrderWhereInput = {};
  if (STATUSES.includes(status as OrderStatus)) where.status = status as OrderStatus;
  if (loja) where.storeId = loja;
  if (q.trim()) {
    where.OR = [
      { customerName: { contains: q.trim(), mode: "insensitive" } },
      { customerPhone: { contains: q.replace(/\D/g, "") || q.trim() } },
    ];
  }

  const [orders, stores] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { store: { select: { name: true } }, items: { include: { options: true } } },
    }),
    prisma.store.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const select = "rounded-md border border-stone-300 bg-white px-3 py-2";

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap gap-2 text-sm">
        <input name="q" defaultValue={q} placeholder="Cliente ou telefone" className={`${select} min-w-48 flex-1`} />
        <select name="loja" defaultValue={loja} className={select}>
          <option value="">Todas as lojas</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className={select}>
          <option value="">Todos os status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button className={secondaryButtonClass}>Filtrar</button>
      </form>

      <p className="text-xs text-stone-500">Mostrando os {orders.length} pedidos mais recentes.</p>
      <ul className="space-y-2">
        {orders.map((o) => (
          <li key={o.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
            <details>
              <summary className="flex cursor-pointer flex-wrap justify-between gap-2">
                <span>
                  <strong>
                    {o.store.name} #{o.number}
                  </strong>{" "}
                  · {o.createdAt.toLocaleString("pt-BR", { timeZone: TIMEZONE, dateStyle: "short", timeStyle: "short" })} ·{" "}
                  {o.customerName}
                </span>
                <span className={o.status === "CANCELED" ? "text-red-700" : ""}>
                  {ORDER_STATUS_LABEL[o.status]} · {formatPrice(o.totalCents)}
                </span>
              </summary>
              <div className="mt-2 space-y-1 text-stone-700">
                <ul>
                  {o.items.map((i) => (
                    <li key={i.id}>
                      {i.quantity}x {i.productName}
                      {i.options.length > 0 && ` (${optionsLabel(i.options)})`}
                      {i.notes && ` · ${i.notes}`}
                    </li>
                  ))}
                </ul>
                <p>
                  {ORDER_TYPE_LABEL[o.type]} · {o.paymentMethod ? PAYMENT_LABEL[o.paymentMethod] : "na comanda"}
                  {o.customerPhone && ` · tel. ${o.customerPhone}`}
                </p>
                {o.deliveryAddress && <p>Entrega: {o.deliveryAddress}</p>}
                {o.cancelReason && <p className="text-red-700">Motivo do cancelamento: {o.cancelReason}</p>}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
