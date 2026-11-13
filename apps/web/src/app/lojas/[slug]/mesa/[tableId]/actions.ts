"use server";

import { prisma } from "@cardapio/db";
import { auth } from "@/auth";
import { isOpenNow } from "@/lib/hours";
import { buildOrderItems, createOrder, type CartLine } from "@/lib/server/orders";
import { isPublicStore } from "@/lib/server/stores";
import { openTab } from "@/lib/server/tabs";

export type TableOrderResult = { ok: true } | { ok: false; error: string };

/** Pedido feito pelo cliente na mesa (QR code). Não exige login: vai para a comanda da mesa. */
export async function placeTableOrder(
  slug: string,
  tableId: string,
  input: { customerName: string; notes?: string; items: CartLine[] },
): Promise<TableOrderResult> {
  const name = input.customerName?.trim();
  if (!name) return { ok: false, error: "Informe seu nome para a equipe saber de quem é o pedido." };

  const table = await prisma.diningTable.findUnique({
    where: { id: tableId },
    include: { store: { include: { openingHours: true } } },
  });
  if (!table || !table.isActive || table.store.slug !== slug || !isPublicStore(table.store)) {
    return { ok: false, error: "Mesa não encontrada. Leia o QR code de novo." };
  }
  if (!isOpenNow(table.store.openingHours)) return { ok: false, error: "A loja está fechada no momento." };

  const built = await buildOrderItems(table.storeId, input.items);
  if (!built.ok) return built;

  const session = await auth();
  try {
    const tab = await openTab(table.storeId, { tableId });
    await createOrder({
      storeId: table.storeId,
      tabId: tab.id,
      customerId: session?.user?.id ?? null,
      type: "DINE_IN",
      status: "PENDING", // a equipe confirma, como nos outros pedidos
      customerName: name.slice(0, 100),
      notes: input.notes?.trim().slice(0, 500) || null,
      subtotalCents: built.subtotalCents,
      totalCents: built.subtotalCents,
      items: { create: built.items },
    });
    return { ok: true };
  } catch (e) {
    console.error("Erro ao criar pedido da mesa", e);
    return { ok: false, error: "Não foi possível enviar o pedido. Tente novamente." };
  }
}
