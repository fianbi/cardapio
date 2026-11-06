import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@cardapio/db";

/** Mesa válida (ativa e da loja publicada) a partir da URL do QR code. */
export async function getTableOr404(slug: string, tableId: string) {
  const table = await prisma.diningTable.findUnique({
    where: { id: tableId },
    include: { store: { include: { openingHours: true } } },
  });
  if (!table || !table.isActive || table.store.slug !== slug || !table.store.isActive) notFound();
  return table;
}
