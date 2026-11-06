"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";

export type FormState = { error?: string; ok?: boolean; at?: number } | undefined;

async function revalidate(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { slug: true } });
  revalidatePath(`/painel/${storeId}`, "layout");
  if (store) revalidatePath(`/lojas/${store.slug}`, "layout");
}

export async function saveIngredient(
  storeId: string,
  ingredientId: string | null,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  await requireStoreOwner(storeId);
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  if (!name) return { error: "Informe o nome do ingrediente." };

  if (ingredientId) {
    await prisma.ingredient.updateMany({ where: { id: ingredientId, storeId }, data: { name } });
  } else {
    await prisma.ingredient.create({ data: { storeId, name } });
  }
  await revalidate(storeId);
  return { ok: true, at: Date.now() };
}

/** Marca o ingrediente como em falta (ou de volta). Os produtos que usam ele seguem junto. */
export async function toggleIngredient(storeId: string, ingredientId: string) {
  await requireStoreOwner(storeId);
  const ing = await prisma.ingredient.findFirst({ where: { id: ingredientId, storeId } });
  if (!ing) return;
  await prisma.ingredient.update({ where: { id: ingredientId }, data: { available: !ing.available } });
  await revalidate(storeId);
}

export async function deleteIngredient(storeId: string, ingredientId: string) {
  await requireStoreOwner(storeId);
  // Sai também dos produtos que usavam (cascade).
  await prisma.ingredient.deleteMany({ where: { id: ingredientId, storeId } });
  await revalidate(storeId);
}

// ─── Ingredientes do produto ────────────────────────────────────────────────

export async function setRecipeItem(storeId: string, productId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireStoreOwner(storeId);
  const ingredientId = String(form.get("ingredientId") ?? "");
  const [product, ingredient] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, storeId } }),
    prisma.ingredient.findFirst({ where: { id: ingredientId, storeId } }),
  ]);
  if (!product || !ingredient) return { error: "Escolha um ingrediente." };

  await prisma.recipeItem.upsert({
    where: { productId_ingredientId: { productId, ingredientId } },
    update: {},
    create: { productId, ingredientId },
  });
  await revalidate(storeId);
  return { ok: true, at: Date.now() };
}

export async function removeRecipeItem(storeId: string, recipeItemId: string) {
  await requireStoreOwner(storeId);
  await prisma.recipeItem.deleteMany({ where: { id: recipeItemId, product: { storeId } } });
  await revalidate(storeId);
}
