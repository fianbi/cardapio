import { notFound } from "next/navigation";
import { prisma } from "@cardapio/db";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { position: "asc" },
        include: { products: { orderBy: { position: "asc" } } },
      },
    },
  });

  if (!store || !store.isActive) notFound();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">{store.name}</h1>
        {store.description && <p className="text-stone-600">{store.description}</p>}
        <p className="mt-1 text-sm text-stone-500">
          {store.city}/{store.state}
          {store.acceptsDelivery && ` · Entrega ${formatPrice(store.deliveryFeeCents)}`}
        </p>
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
                <div>
                  <p className="font-medium">{product.name}</p>
                  {product.description && <p className="text-sm text-stone-600">{product.description}</p>}
                  {!product.isAvailable && <p className="text-xs font-medium text-red-600">Em falta</p>}
                </div>
                <p className="whitespace-nowrap font-semibold">{formatPrice(product.priceCents)}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
