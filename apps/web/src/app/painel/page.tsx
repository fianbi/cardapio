import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@cardapio/db";
import { requireUser } from "@/lib/store-auth";
import { buttonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PanelHome() {
  const session = await requireUser();
  const stores = await prisma.store.findMany({
    where: { ownerId: session.user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, isActive: true },
  });

  if (stores.length === 1) redirect(`/painel/${stores[0].id}`);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Painel do estabelecimento</h1>
      {stores.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-6 text-center">
          <p className="text-stone-600">Você ainda não tem uma loja cadastrada.</p>
          <Link href="/painel/nova" className={`${buttonClass} mt-4 inline-block`}>
            Cadastrar minha loja
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {stores.map((s) => (
              <li key={s.id}>
                <Link href={`/painel/${s.id}`} className="flex justify-between p-4 hover:bg-stone-50">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-sm text-stone-500">{s.isActive ? "Publicada" : "Rascunho"}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/painel/nova" className="text-sm text-brand-700 hover:underline">
            + Cadastrar outra loja
          </Link>
        </>
      )}
    </div>
  );
}
