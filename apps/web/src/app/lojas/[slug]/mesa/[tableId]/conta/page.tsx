import Link from "next/link";
import { prisma } from "@cardapio/db";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { getTableOr404 } from "@/lib/server/table";
import { serviceFee, tabSubtotal } from "@/lib/server/tabs";
import { AutoRefresh } from "@/components/auto-refresh";
import { buttonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TableBillPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; tableId: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const [{ slug, tableId }, { novo }] = await Promise.all([params, searchParams]);
  const table = await getTableOr404(slug, tableId);
  const tab = await prisma.tab.findFirst({
    where: { tableId, status: "OPEN" },
    include: { orders: { orderBy: { createdAt: "asc" }, include: { items: true } } },
  });

  const subtotal = tab ? tabSubtotal(tab.orders) : 0;
  const fee = serviceFee(subtotal, table.store.serviceFeePercent);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AutoRefresh seconds={15} />
      {novo && (
        <p className="rounded-md bg-green-50 px-4 py-3 text-green-800">
          Pedido enviado para a cozinha! Acompanhe o andamento aqui.
        </p>
      )}
      <div>
        <p className="text-sm text-stone-500">{table.store.name}</p>
        <h1 className="text-2xl font-bold">Conta da {table.label}</h1>
      </div>

      {!tab || tab.orders.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-stone-500">
          Nenhum pedido nesta mesa ainda.
        </p>
      ) : (
        <section className="rounded-lg border border-stone-200 bg-white">
          <ul className="divide-y divide-stone-200">
            {tab.orders.map((o) => (
              <li key={o.id} className={`p-4 ${o.status === "CANCELED" ? "opacity-50" : ""}`}>
                <p className="text-xs text-stone-500">
                  {o.customerName} · <strong>{ORDER_STATUS_LABEL[o.status]}</strong>
                </p>
                <ul className="mt-1 text-sm">
                  {o.items.map((i) => (
                    <li key={i.id} className="flex justify-between gap-3">
                      <span>
                        {i.quantity}x {i.productName}
                      </span>
                      <span>{formatPrice(i.unitPriceCents * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-stone-200 p-4 text-sm">
            <div className="flex justify-between">
              <span>Consumo</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {fee > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Taxa de serviço ({table.store.serviceFeePercent}%, opcional)</span>
                <span>{formatPrice(fee)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(subtotal + fee)}</span>
            </div>
            <p className="pt-2 text-stone-500">Para pagar, chame a equipe e peça para fechar a conta.</p>
          </div>
        </section>
      )}

      <Link href={`/lojas/${slug}/mesa/${tableId}`} className={`${buttonClass} block text-center`}>
        Pedir mais
      </Link>
    </div>
  );
}
