import Link from "next/link";
import { requireStoreOwner } from "@/lib/store-auth";
import { PanelNav } from "./panel-nav";

export default async function StorePanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const { store } = await requireStoreOwner(storeId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500">Painel</p>
          <h1 className="text-2xl font-bold">{store.name}</h1>
        </div>
        {store.isActive ? (
          <Link href={`/lojas/${store.slug}`} className="text-sm text-brand-700 hover:underline" target="_blank">
            Ver página pública ↗
          </Link>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Rascunho: ainda não aparece para os clientes
          </span>
        )}
      </div>
      <PanelNav storeId={store.id} />
      {children}
    </div>
  );
}
