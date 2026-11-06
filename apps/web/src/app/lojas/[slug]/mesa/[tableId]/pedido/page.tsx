import Link from "next/link";
import { auth } from "@/auth";
import { isOpenNow } from "@/lib/hours";
import { getTableOr404 } from "@/lib/server/table";
import { TableOrderForm } from "./table-order-form";

export const dynamic = "force-dynamic";

export default async function TableOrderPage({ params }: { params: Promise<{ slug: string; tableId: string }> }) {
  const { slug, tableId } = await params;
  const [table, session] = await Promise.all([getTableOr404(slug, tableId), auth()]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/lojas/${slug}/mesa/${tableId}`} className="text-sm text-brand-700 hover:underline">
          ← Voltar ao cardápio
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Confirmar pedido</h1>
        <p className="text-stone-600">
          {table.store.name} · {table.label}
        </p>
      </div>
      <TableOrderForm
        slug={slug}
        tableId={tableId}
        isOpen={isOpenNow(table.store.openingHours)}
        defaultName={session?.user?.name?.split(" ")[0] ?? ""}
      />
    </div>
  );
}
