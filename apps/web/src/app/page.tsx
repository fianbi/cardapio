import Link from "next/link";
import { prisma, type Prisma } from "@cardapio/db";
import { isOpenNow, todayLabel } from "@/lib/hours";
import { OpenBadge } from "@/components/open-badge";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; tipo?: string; aberto?: string }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "", tipo = "", aberto } = await searchParams;
  const onlyOpen = aberto === "1";

  const where: Prisma.StoreWhereInput = { isActive: true };
  if (q.trim()) {
    const term = q.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { products: { some: { name: { contains: term, mode: "insensitive" } } } },
    ];
  }
  if (tipo) where.cuisines = { has: tipo };

  const [stores, allCuisines] = await Promise.all([
    prisma.store.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        slug: true,
        name: true,
        description: true,
        cuisines: true,
        deliveryFeeCents: true,
        acceptsDelivery: true,
        openingHours: { select: { weekday: true, opensAt: true, closesAt: true } },
      },
    }),
    prisma.store.findMany({ where: { isActive: true }, select: { cuisines: true } }),
  ]);

  const cuisines = [...new Set(allCuisines.flatMap((s) => s.cuisines))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const withStatus = stores
    .map((s) => ({ ...s, open: isOpenNow(s.openingHours) }))
    .filter((s) => !onlyOpen || s.open)
    .sort((a, b) => Number(b.open) - Number(a.open));

  const filterHref = (next: { tipo?: string; aberto?: boolean }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const t = next.tipo ?? tipo;
    if (t) params.set("tipo", t);
    if (next.aberto ?? onlyOpen) params.set("aberto", "1");
    const s = params.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">Onde vamos pedir hoje?</h1>
        <p className="text-stone-600">Todos os cardápios da cidade em um só lugar.</p>
      </section>

      <form action="/" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Busque por loja ou prato (ex.: pizza, x-bacon)"
          aria-label="Buscar"
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2"
        />
        {tipo && <input type="hidden" name="tipo" value={tipo} />}
        {onlyOpen && <input type="hidden" name="aberto" value="1" />}
        <button className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">Buscar</button>
      </form>

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filtros">
        <Link
          href={filterHref({ aberto: !onlyOpen })}
          className={`rounded-full border px-3 py-1 ${onlyOpen ? "border-green-700 bg-green-700 text-white" : "border-stone-300 bg-white"}`}
        >
          Aberto agora
        </Link>
        <Link
          href={filterHref({ tipo: "" })}
          className={`rounded-full border px-3 py-1 ${!tipo ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 bg-white"}`}
        >
          Todos
        </Link>
        {cuisines.map((c) => (
          <Link
            key={c}
            href={filterHref({ tipo: c })}
            className={`rounded-full border px-3 py-1 capitalize ${tipo === c ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 bg-white"}`}
          >
            {c}
          </Link>
        ))}
      </nav>

      {withStatus.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-stone-500">
          Nenhum estabelecimento encontrado.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {withStatus.map((store) => (
            <li key={store.slug}>
              <Link
                href={`/lojas/${store.slug}`}
                className={`block h-full rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md ${store.open ? "" : "opacity-70"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{store.name}</h2>
                  <OpenBadge open={store.open} />
                </div>
                {store.description && <p className="text-sm text-stone-600">{store.description}</p>}
                <p className="mt-2 text-xs text-stone-500">{todayLabel(store.openingHours)}</p>
                {store.cuisines.length > 0 && (
                  <p className="mt-1 text-xs uppercase tracking-wide text-brand-700">{store.cuisines.join(" · ")}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="pt-6 text-center text-sm text-stone-500">
        Tem uma lanchonete ou restaurante?{" "}
        <Link href="/painel/nova" className="font-medium text-brand-700 hover:underline">
          Cadastre sua loja
        </Link>
      </p>
    </div>
  );
}
