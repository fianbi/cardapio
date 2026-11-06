import "server-only";
import { prisma } from "@cardapio/db";
import { retryOnConflict } from "./orders";

/** Abre uma comanda nova (com o próximo número da loja). */
export function openTab(storeId: string, data: { tableId?: string | null; label?: string | null }) {
  return retryOnConflict(() =>
    prisma.$transaction(async (tx) => {
      if (data.tableId) {
        // Se a mesa já tem comanda aberta, usa ela.
        const open = await tx.tab.findFirst({ where: { tableId: data.tableId, status: "OPEN" } });
        if (open) return open;
      }
      const last = await tx.tab.findFirst({ where: { storeId }, orderBy: { number: "desc" }, select: { number: true } });
      return tx.tab.create({
        data: {
          storeId,
          tableId: data.tableId ?? null,
          label: data.label?.trim().slice(0, 60) || null,
          number: (last?.number ?? 0) + 1,
        },
      });
    }),
  );
}

/** Soma os pedidos não cancelados da comanda. */
export function tabSubtotal(orders: { status: string; subtotalCents: number }[]) {
  return orders.filter((o) => o.status !== "CANCELED").reduce((s, o) => s + o.subtotalCents, 0);
}

export function serviceFee(subtotalCents: number, percent: number) {
  return Math.round((subtotalCents * percent) / 100);
}
