import "server-only";
import { prisma, type Prisma } from "@cardapio/db";

type Tx = Prisma.TransactionClient;

export class OutOfStockError extends Error {}

export type ProductStock = {
  /** Quantas unidades dá para vender com o estoque atual (Infinity se não tem ficha técnica). */
  maxUnits: number;
  /** Ingredientes que não dão nem para 1 unidade. */
  missing: string[];
};

/** Disponibilidade de cada produto da loja de acordo com a ficha técnica. */
export async function getStockAvailability(storeId: string, productIds?: string[]) {
  const recipes = await prisma.recipeItem.findMany({
    where: { product: { storeId }, ...(productIds ? { productId: { in: productIds } } : {}) },
    include: { ingredient: { select: { name: true, stockQty: true } } },
  });

  const result = new Map<string, ProductStock>();
  for (const r of recipes) {
    const current = result.get(r.productId) ?? { maxUnits: Infinity, missing: [] };
    const units = r.quantity > 0 ? Math.floor(r.ingredient.stockQty / r.quantity) : Infinity;
    current.maxUnits = Math.min(current.maxUnits, Math.max(units, 0));
    if (units < 1) current.missing.push(r.ingredient.name);
    result.set(r.productId, current);
  }
  return result;
}

/** Quanto de cada ingrediente um conjunto de itens consome. */
async function ingredientNeeds(db: Tx | typeof prisma, items: { productId: string | null; quantity: number }[]) {
  const ids = items.map((i) => i.productId).filter((id): id is string => !!id);
  if (ids.length === 0) return new Map<string, { need: number; name: string }>();
  const recipes = await db.recipeItem.findMany({
    where: { productId: { in: ids } },
    include: { ingredient: { select: { name: true } } },
  });
  const needs = new Map<string, { need: number; name: string }>();
  for (const item of items) {
    for (const r of recipes.filter((x) => x.productId === item.productId)) {
      const cur = needs.get(r.ingredientId) ?? { need: 0, name: r.ingredient.name };
      cur.need += r.quantity * item.quantity;
      needs.set(r.ingredientId, cur);
    }
  }
  return needs;
}

/** Confere (sem baixar) se há estoque para os itens. Retorna a mensagem de erro, ou null. */
export async function checkStock(items: { productId: string; quantity: number; productName: string }[]) {
  const needs = await ingredientNeeds(prisma, items);
  if (needs.size === 0) return null;
  const stock = await prisma.ingredient.findMany({ where: { id: { in: [...needs.keys()] } } });
  const short = stock.filter((i) => i.stockQty < (needs.get(i.id)?.need ?? 0)).map((i) => i.name);
  if (short.length === 0) return null;
  return `Não temos estoque suficiente para este pedido (acabou: ${short.join(", ")}). Diminua a quantidade ou escolha outro item.`;
}

/** Baixa o estoque do pedido dentro da transação. Lança OutOfStockError se faltar algo. */
export async function deductForOrder(
  tx: Tx,
  storeId: string,
  orderId: string,
  items: { productId: string | null; quantity: number }[],
) {
  const needs = await ingredientNeeds(tx, items);
  for (const [ingredientId, { need, name }] of needs) {
    // Atualização condicional: só baixa se ainda houver o suficiente (evita vender o mesmo estoque duas vezes).
    const updated = await tx.ingredient.updateMany({
      where: { id: ingredientId, stockQty: { gte: need } },
      data: { stockQty: { decrement: need } },
    });
    if (updated.count === 0) {
      throw new OutOfStockError(`Acabou o estoque de ${name}. Atualize o pedido e tente de novo.`);
    }
    await tx.stockMovement.create({ data: { storeId, ingredientId, delta: -need, reason: "SALE", orderId } });
  }
}

/** Devolve ao estoque o que o pedido baixou (usado ao cancelar). Idempotente. */
export async function returnForOrder(tx: Tx, orderId: string) {
  const moves = await tx.stockMovement.groupBy({
    by: ["ingredientId", "storeId"],
    where: { orderId, reason: { in: ["SALE", "RETURN"] } },
    _sum: { delta: true },
  });
  for (const m of moves) {
    const outstanding = -(m._sum.delta ?? 0); // quanto ainda não voltou
    if (outstanding <= 0) continue;
    await tx.ingredient.update({ where: { id: m.ingredientId }, data: { stockQty: { increment: outstanding } } });
    await tx.stockMovement.create({
      data: { storeId: m.storeId, ingredientId: m.ingredientId, delta: outstanding, reason: "RETURN", orderId },
    });
  }
}

/** Cancela um pedido e devolve o estoque, de forma atômica. Só cancela se o status ainda for um dos `from`. */
export async function cancelOrderAndRestock(orderId: string, where: Prisma.OrderWhereInput) {
  return prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({ where: { ...where, id: orderId }, data: { status: "CANCELED" } });
    if (res.count > 0) await returnForOrder(tx, orderId);
    return res.count > 0;
  });
}
