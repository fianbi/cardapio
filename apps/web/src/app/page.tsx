import Link from "next/link";
import { prisma } from "@cardapio/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { slug: true, name: true, description: true, cuisines: true, logoUrl: true },
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">Onde vamos pedir hoje?</h1>
        <p className="text-stone-600">Todos os cardápios da cidade em um só lugar.</p>
      </section>

      {stores.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-stone-500">
          Nenhum estabelecimento cadastrado ainda. Rode <code>pnpm db:seed</code> para criar um exemplo.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {stores.map((store) => (
            <li key={store.slug}>
              <Link
                href={`/lojas/${store.slug}`}
                className="block rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <h2 className="font-semibold">{store.name}</h2>
                {store.description && <p className="text-sm text-stone-600">{store.description}</p>}
                {store.cuisines.length > 0 && (
                  <p className="mt-2 text-xs uppercase tracking-wide text-brand-700">
                    {store.cuisines.join(" · ")}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
