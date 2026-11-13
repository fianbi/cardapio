import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@cardapio/db";
import { auth } from "@/auth";
import { isOpenNow } from "@/lib/hours";
import { isPublicStore } from "@/lib/server/stores";
import { formatAddress } from "@/lib/address";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/entrar?callbackUrl=${encodeURIComponent(`/lojas/${slug}/checkout`)}`);

  const [store, user, addresses] = await Promise.all([
    prisma.store.findUnique({ where: { slug }, include: { openingHours: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, phone: true } }),
    prisma.address.findMany({ where: { userId: session.user.id }, orderBy: { updatedAt: "desc" } }),
  ]);
  if (!store || !isPublicStore(store)) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/lojas/${slug}`} className="text-sm text-brand-700 hover:underline">
          ← Voltar ao cardápio
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Finalizar pedido</h1>
        <p className="text-stone-600">{store.name}</p>
      </div>

      <CheckoutForm
        store={{
          slug: store.slug,
          isOpen: isOpenNow(store.openingHours),
          isPaused: store.isPaused,
          acceptsDelivery: store.acceptsDelivery,
          acceptsPickup: store.acceptsPickup,
          acceptsDineIn: store.acceptsDineIn,
          deliveryFeeCents: store.deliveryFeeCents,
          minOrderCents: store.minOrderCents,
        }}
        defaults={{ name: user?.name ?? "", phone: user?.phone ?? "" }}
        addresses={addresses.map((a) => ({ id: a.id, label: a.label || `${a.street}, ${a.number}`, text: formatAddress(a) }))}
      />
    </div>
  );
}
