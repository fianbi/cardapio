import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@cardapio/db";
import { auth } from "@/auth";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABEL, ORDER_TYPE_LABEL, PAYMENT_LABEL, statusSteps } from "@/lib/orders";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const [{ id }, { novo }] = await Promise.all([params, searchParams]);
  const session = await auth();
  if (!session?.user) redirect(`/entrar?callbackUrl=${encodeURIComponent(`/pedidos/${id}`)}`);

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, store: { select: { name: true, slug: true } } },
  });
  if (!order || order.customerId !== session.user.id) notFound();

  const steps = statusSteps(order.type);
  const current = steps.indexOf(order.status);
  const finished = order.status === "COMPLETED" || order.status === "CANCELED";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {!finished && <AutoRefresh />}

      {novo && (
        <p className="rounded-md bg-green-50 px-4 py-3 text-green-800">
          Pedido enviado! A loja vai confirmar em instantes. Esta página atualiza sozinha.
        </p>
      )}

      <div>
        <p className="text-sm text-stone-500">
          <Link href={`/lojas/${order.store.slug}`} className="hover:underline">
            {order.store.name}
          </Link>
        </p>
        <h1 className="text-2xl font-bold">Pedido #{order.number}</h1>
        <p className="text-sm text-stone-500">
          {order.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
          {" · "}
          {ORDER_TYPE_LABEL[order.type]}
        </p>
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-4">
        {order.status === "CANCELED" ? (
          <p className="font-semibold text-red-700">Pedido cancelado</p>
        ) : (
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${i < current ? "bg-green-600" : i === current ? "bg-brand-600 ring-4 ring-brand-100" : "bg-stone-300"}`}
                />
                <span className={i === current ? "font-semibold" : i < current ? "text-stone-700" : "text-stone-400"}>
                  {ORDER_STATUS_LABEL[step]}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-lg border border-stone-200 bg-white">
        <ul className="divide-y divide-stone-200">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 p-4 text-sm">
              <div>
                <p>
                  {item.quantity}x {item.productName}
                </p>
                {item.notes && <p className="text-stone-500">{item.notes}</p>}
              </div>
              <span>{formatPrice(item.unitPriceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-stone-200 p-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotalCents)}</span>
          </div>
          {order.type === "DELIVERY" && (
            <div className="flex justify-between">
              <span>Taxa de entrega</span>
              <span>{order.deliveryFeeCents ? formatPrice(order.deliveryFeeCents) : "Grátis"}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatPrice(order.totalCents)}</span>
          </div>
          <p className="pt-2 text-stone-600">
            Pagamento: {order.paymentMethod ? PAYMENT_LABEL[order.paymentMethod] : "na comanda"}
            {order.changeForCents && ` · troco para ${formatPrice(order.changeForCents)}`}
          </p>
          {order.deliveryAddress && <p className="text-stone-600">Entrega em: {order.deliveryAddress}</p>}
          {order.notes && <p className="text-stone-600">Observações: {order.notes}</p>}
        </div>
      </section>

    </div>
  );
}
