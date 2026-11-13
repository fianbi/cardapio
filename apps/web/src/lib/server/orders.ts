import "server-only";
import { prisma, Prisma } from "@cardapio/db";
import { getMissingIngredients } from "./ingredients";
import { selectOptions } from "@cardapio/shared/options";

export type CartLine = { productId: string; quantity: number; notes?: string; optionIds?: string[] };

export type BuiltItem = {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  notes: string | null;
  options: { create: { groupName: string; optionName: string; priceCents: number }[] };
};

type BuiltItems = { ok: true; subtotalCents: number; items: BuiltItem[] } | { ok: false; error: string };

/** Confere os produtos no banco (loja, disponibilidade, opções) e monta os itens com o preço atual. */
export async function buildOrderItems(storeId: string, lines: CartLine[]): Promise<BuiltItems> {
  const valid = (lines ?? []).filter((i) => Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 99);
  if (valid.length === 0) return { ok: false, error: "Nenhum item no pedido." };

  const products = await prisma.product.findMany({
    where: { id: { in: valid.map((i) => i.productId) }, storeId },
    include: { optionGroups: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const missing = await getMissingIngredients(storeId);
  const unavailable = valid.filter((i) => !byId.get(i.productId)?.isAvailable || missing.has(i.productId));
  if (unavailable.length > 0) {
    const names = unavailable.map((i) => byId.get(i.productId)?.name).filter(Boolean);
    return {
      ok: false,
      error: names.length
        ? `Não temos mais: ${names.join(", ")}. Remova do pedido para continuar.`
        : "Alguns itens não existem mais. Remova-os para continuar.",
    };
  }

  const items: BuiltItem[] = [];
  for (const line of valid) {
    const p = byId.get(line.productId)!;
    const selection = selectOptions(p.optionGroups, Array.isArray(line.optionIds) ? line.optionIds.map(String) : []);
    if (!selection.ok) return { ok: false, error: `${p.name}: ${selection.error}` };
    items.push({
      productId: p.id,
      productName: p.name,
      unitPriceCents: p.priceCents + selection.extraCents,
      quantity: line.quantity,
      notes: line.notes?.trim().slice(0, 200) || null,
      options: { create: selection.chosen },
    });
  }
  return { ok: true, items, subtotalCents: items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0) };
}

/**
 * Executa `fn` de novo quando bate em violação de unicidade (P2002), que é o que acontece
 * quando dois pedidos/comandas pegam o mesmo número sequencial ao mesmo tempo.
 */
export async function retryOnConflict<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i < attempts - 1 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
}

/** Cria um pedido com o próximo número da loja. */
export function createOrder(data: Omit<Prisma.OrderUncheckedCreateInput, "number">) {
  return retryOnConflict(() =>
    prisma.$transaction(async (tx) => {
      const last = await tx.order.findFirst({
        where: { storeId: data.storeId },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      return tx.order.create({ data: { ...data, number: (last?.number ?? 0) + 1 }, select: { id: true } });
    }),
  );
}
