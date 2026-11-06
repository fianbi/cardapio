"use server";

import { revalidatePath } from "next/cache";
import { prisma, type IngredientUnit, type StockMovementReason } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";

export type FormState = { error?: string; ok?: boolean; at?: number } | undefined;

const UNITS: IngredientUnit[] = ["UNIT", "GRAM", "MILLILITER"];

function intField(form: FormData, key: string) {
  const raw = String(form.get(key) ?? "").replace(/\./g, "").replace(",", ".").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

async function revalidate(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { slug: true } });
  revalidatePath(`/painel/${storeId}`, "layout");
  if (store) revalidatePath(`/lojas/${store.slug}`);
}

export async function saveIngredient(
  storeId: string,
  ingredientId: string | null,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  await requireStoreOwner(storeId);
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const unit = String(form.get("unit") ?? "") as IngredientUnit;
  const minQty = intField(form, "minQty") ?? 0;
  if (!name) return { error: "Informe o nome do ingrediente." };
  if (!UNITS.includes(unit)) return { error: "Escolha a unidade." };
  if (Number.isNaN(minQty) || minQty < 0) return { error: "Estoque mínimo inválido." };

  if (ingredientId) {
    await prisma.ingredient.updateMany({ where: { id: ingredientId, storeId }, data: { name, unit, minQty } });
  } else {
    const initial = intField(form, "stockQty") ?? 0;
    if (Number.isNaN(initial) || initial < 0) return { error: "Quantidade inicial inválida." };
    await prisma.$transaction(async (tx) => {
      const ing = await tx.ingredient.create({ data: { storeId, name, unit, minQty, stockQty: initial } });
      if (initial > 0) {
        await tx.stockMovement.create({
          data: { storeId, ingredientId: ing.id, delta: initial, reason: "PURCHASE", note: "Estoque inicial" },
        });
      }
    });
  }
  await revalidate(storeId);
  return { ok: true, at: Date.now() };
}

/** Entrada (compra), perda ou contagem (define o valor exato). */
export async function moveStock(storeId: string, ingredientId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireStoreOwner(storeId);
  const kind = String(form.get("kind") ?? "");
  const qty = intField(form, "qty");
  const note = String(form.get("note") ?? "").trim().slice(0, 200) || null;
  if (qty === null || Number.isNaN(qty) || qty < 0) return { error: "Informe uma quantidade válida." };

  const ing = await prisma.ingredient.findFirst({ where: { id: ingredientId, storeId } });
  if (!ing) return { error: "Ingrediente não encontrado." };

  let reason: StockMovementReason;
  let delta: number;
  if (kind === "PURCHASE") {
    if (qty === 0) return { error: "Informe a quantidade que entrou." };
    reason = "PURCHASE";
    delta = qty;
  } else if (kind === "LOSS") {
    if (qty === 0) return { error: "Informe a quantidade perdida." };
    reason = "LOSS";
    delta = -Math.min(qty, Math.max(ing.stockQty, 0));
  } else if (kind === "COUNT") {
    reason = "ADJUSTMENT";
    delta = qty - ing.stockQty;
  } else {
    return { error: "Escolha o tipo de movimentação." };
  }
  if (delta === 0) return { ok: true, at: Date.now() };

  await prisma.$transaction([
    prisma.ingredient.update({ where: { id: ingredientId }, data: { stockQty: { increment: delta } } }),
    prisma.stockMovement.create({ data: { storeId, ingredientId, delta, reason, note } }),
  ]);
  await revalidate(storeId);
  return { ok: true, at: Date.now() };
}

export async function deleteIngredient(storeId: string, ingredientId: string) {
  await requireStoreOwner(storeId);
  // Remove também das fichas técnicas (cascade); o histórico de movimentações vai junto.
  await prisma.ingredient.deleteMany({ where: { id: ingredientId, storeId } });
  await revalidate(storeId);
}

// ─── Ficha técnica ──────────────────────────────────────────────────────────

export async function setRecipeItem(storeId: string, productId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireStoreOwner(storeId);
  const ingredientId = String(form.get("ingredientId") ?? "");
  const quantity = intField(form, "quantity");
  if (quantity === null || Number.isNaN(quantity) || quantity <= 0) return { error: "Informe a quantidade usada." };

  const [product, ingredient] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, storeId } }),
    prisma.ingredient.findFirst({ where: { id: ingredientId, storeId } }),
  ]);
  if (!product || !ingredient) return { error: "Escolha um ingrediente." };

  await prisma.recipeItem.upsert({
    where: { productId_ingredientId: { productId, ingredientId } },
    update: { quantity },
    create: { productId, ingredientId, quantity },
  });
  await revalidate(storeId);
  return { ok: true, at: Date.now() };
}

export async function removeRecipeItem(storeId: string, recipeItemId: string) {
  await requireStoreOwner(storeId);
  await prisma.recipeItem.deleteMany({ where: { id: recipeItemId, product: { storeId } } });
  await revalidate(storeId);
}
