import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@cardapio/db";
import { auth } from "@/auth";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect(`/entrar?callbackUrl=${encodeURIComponent("/pedidos")}`);

  const orders = await prisma.order.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { store: { select: { name: true } }, _count: { select: { items: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Meus pedidos</h1>
      {orders.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-stone-500">
          Você ainda não fez nenhum pedido.{" "}
          <Link href="/" className="text-brand-700 underline">
            Ver lojas
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/pedidos/${o.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-stone-50">
                <div>
                  <p className="font-medium">
                    {o.store.name} · #{o.number}
                  </p>
                  <p className="text-sm text-stone-500">
                    {o.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
                    {" · "}
                    {ORDER_STATUS_LABEL[o.status]}
                  </p>
                </div>
                <span className="font-semibold">{formatPrice(o.totalCents)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
