import { notFound } from "next/navigation";
import { prisma } from "@cardapio/db";
import { formatPrice } from "@/lib/format";
import { isOpenNow, todayLabel } from "@/lib/hours";
import { AddToCart } from "@/components/add-to-cart";
import { CartBar } from "@/components/cart-bar";
import { OpenBadge } from "@/components/open-badge";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug },
    include: {
      openingHours: true,
      categories: {
        orderBy: { position: "asc" },
        include: { products: { orderBy: { position: "asc" } } },
      },
    },
  });

  if (!store || !store.isActive) notFound();
  const open = isOpenNow(store.openingHours);
  const modes = [
    store.acceptsDelivery && `Entrega ${store.deliveryFeeCents ? formatPrice(store.deliveryFeeCents) : "grátis"}`,
    store.acceptsPickup && "Retirada",
    store.acceptsDineIn && "Consumo no local",
  ].filter(Boolean);

  return (
    <div className="space-y-8 pb-20">
      <section>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <OpenBadge open={open} />
        </div>
        {store.description && <p className="text-stone-600">{store.description}</p>}
        <p className="mt-1 text-sm text-stone-500">
          {todayLabel(store.openingHours)} · {modes.join(" · ")}
          {store.minOrderCents > 0 && ` · Pedido mínimo ${formatPrice(store.minOrderCents)}`}
        </p>
        {!open && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            A loja está fechada agora. Você pode ver o cardápio, mas os pedidos só abrem no horário de funcionamento.
          </p>
        )}
      </section>

      {store.categories.map((category) => (
        <section key={category.id}>
          <h2 className="mb-3 text-lg font-semibold">{category.name}</h2>
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {category.products.map((product) => (
              <li
                key={product.id}
                className={`flex items-start justify-between gap-4 p-4 ${product.isAvailable ? "" : "opacity-50"}`}
              >
                {product.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-md object-cover" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{product.name}</p>
                  {product.description && <p className="text-sm text-stone-600">{product.description}</p>}
                  <p className="mt-1 font-semibold">{formatPrice(product.priceCents)}</p>
                  {!product.isAvailable && <p className="text-xs font-medium text-red-600">Em falta</p>}
                </div>
                <AddToCart
                  storeSlug={store.slug}
                  product={{ id: product.id, name: product.name, priceCents: product.priceCents }}
                  disabled={!product.isAvailable || !open}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <CartBar storeSlug={store.slug} isOpen={open} />
    </div>
  );
}
