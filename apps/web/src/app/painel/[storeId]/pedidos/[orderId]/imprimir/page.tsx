import { notFound } from "next/navigation";
import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { formatPrice } from "@/lib/format";
import { ORDER_TYPE_LABEL, PAYMENT_LABEL } from "@/lib/orders";
import { TIMEZONE } from "@/lib/hours";
import { PrintOnLoad } from "./print-on-load";

export const dynamic = "force-dynamic";

/** Cupom do pedido para impressora térmica (80 mm) ou comum. Abre e já chama a impressão. */
export default async function PrintOrder({ params }: { params: Promise<{ storeId: string; orderId: string }> }) {
  const { storeId, orderId } = await params;
  const { store } = await requireStoreOwner(storeId);
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    include: { items: { include: { options: true } }, tab: { include: { table: true } } },
  });
  if (!order) notFound();

  return (
    <div className="ticket mx-auto w-[72mm] bg-white p-2 font-mono text-[12px] leading-tight text-black">
      <PrintOnLoad />
      <p className="text-center text-sm font-bold">{store.name}</p>
      <p className="text-center text-lg font-bold">PEDIDO #{order.number}</p>
      <p className="text-center">
        {order.createdAt.toLocaleString("pt-BR", { timeZone: TIMEZONE, dateStyle: "short", timeStyle: "short" })}
      </p>
      <p className="mt-1 text-center font-bold uppercase">
        {order.tab ? `${order.tab.table?.label ?? order.tab.label ?? "Balcão"} · comanda #${order.tab.number}` : ORDER_TYPE_LABEL[order.type]}
      </p>
      <hr className="my-2 border-dashed border-black" />
      <ul className="space-y-1">
        {order.items.map((i) => (
          <li key={i.id}>
            <div className="flex justify-between gap-2">
              <span className="font-bold">
                {i.quantity}x {i.productName}
              </span>
              <span>{formatPrice(i.unitPriceCents * i.quantity)}</span>
            </div>
            {i.options.map((o) => (
              <p key={o.id} className="pl-3">
                + {o.optionName}
              </p>
            ))}
            {i.notes && <p className="pl-3 font-bold">OBS: {i.notes}</p>}
          </li>
        ))}
      </ul>
      <hr className="my-2 border-dashed border-black" />
      {order.deliveryFeeCents > 0 && (
        <>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span>Entrega</span>
            <span>{formatPrice(order.deliveryFeeCents)}</span>
          </div>
        </>
      )}
      <div className="flex justify-between text-sm font-bold">
        <span>TOTAL</span>
        <span>{formatPrice(order.totalCents)}</span>
      </div>
      <p>
        Pagamento: {order.paymentMethod ? PAYMENT_LABEL[order.paymentMethod] : "na comanda"}
        {order.changeForCents ? ` · troco para ${formatPrice(order.changeForCents)}` : ""}
      </p>
      <hr className="my-2 border-dashed border-black" />
      <p className="font-bold">{order.customerName}</p>
      {order.customerPhone && <p>Tel.: {order.customerPhone}</p>}
      {order.deliveryAddress && <p>Entrega: {order.deliveryAddress}</p>}
      {order.notes && <p className="font-bold">OBS: {order.notes}</p>}
    </div>
  );
}
