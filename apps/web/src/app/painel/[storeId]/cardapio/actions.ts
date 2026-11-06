"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { parsePriceToCents } from "@/lib/format";

export type FormState = { error?: string; ok?: boolean; at?: number } | undefined;

async function revalidate(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { slug: true } });
  revalidatePath(`/painel/${storeId}/cardapio`);
  if (store) revalidatePath(`/lojas/${store.slug}`);
}

/** Troca a posição de um item com o vizinho (dir = -1 sobe, +1 desce). */
async function swap<T extends { id: string }>(list: T[], id: string, dir: -1 | 1, save: (id: string, position: number) => Promise<unknown>) {
  const index = list.findIndex((x) => x.id === id);
  const target = index + dir;
  if (index < 0 || target < 0 || target >= list.length) return;
  const reordered = [...list];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  await Promise.all(reordered.map((x, i) => save(x.id, i)));
}

// ─── Categorias ─────────────────────────────────────────────────────────────

export async function addCategory(storeId: string, form: FormData) {
  await requireStoreOwner(storeId);
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  const count = await prisma.menuCategory.count({ where: { storeId } });
  await prisma.menuCategory.create({ data: { storeId, name, position: count } });
  await revalidate(storeId);
}

export async function renameCategory(storeId: string, categoryId: string, form: FormData) {
  await requireStoreOwner(storeId);
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  await prisma.menuCategory.updateMany({ where: { id: categoryId, storeId }, data: { name } });
  await revalidate(storeId);
}

export async function deleteCategory(storeId: string, categoryId: string) {
  await requireStoreOwner(storeId);
  // Só apaga categoria vazia, para nenhum produto sumir do cardápio.
  const products = await prisma.product.count({ where: { categoryId, storeId } });
  if (products > 0) return;
  await prisma.menuCategory.deleteMany({ where: { id: categoryId, storeId } });
  await revalidate(storeId);
}

export async function moveCategory(storeId: string, categoryId: string, dir: -1 | 1) {
  await requireStoreOwner(storeId);
  const list = await prisma.menuCategory.findMany({ where: { storeId }, orderBy: { position: "asc" }, select: { id: true } });
  await swap(list, categoryId, dir, (id, position) => prisma.menuCategory.update({ where: { id }, data: { position } }));
  await revalidate(storeId);
}

// ─── Produtos ───────────────────────────────────────────────────────────────

export async function saveProduct(
  storeId: string,
  productId: string | null,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  await requireStoreOwner(storeId);

  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const imageUrl = String(form.get("imageUrl") ?? "").trim();
  const categoryId = String(form.get("categoryId") ?? "");
  const priceCents = parsePriceToCents(form.get("price"));

  if (!name) return { error: "Informe o nome do produto." };
  if (priceCents === null) return { error: "Preço inválido. Use o formato 22,50." };
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) return { error: "O link da foto deve começar com http:// ou https://" };

  const category = await prisma.menuCategory.findFirst({ where: { id: categoryId, storeId } });
  if (!category) return { error: "Escolha uma categoria." };

  const data = {
    name: name.slice(0, 100),
    description: description.slice(0, 500) || null,
    imageUrl: imageUrl || null,
    priceCents,
    categoryId: category.id,
  };

  if (productId) {
    const existing = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!existing) return { error: "Produto não encontrado." };
    const position =
      existing.categoryId === category.id
        ? existing.position
        : await prisma.product.count({ where: { storeId, categoryId: category.id } });
    await prisma.product.update({ where: { id: productId }, data: { ...data, position } });
  } else {
    const position = await prisma.product.count({ where: { storeId, categoryId: category.id } });
    await prisma.product.create({ data: { ...data, storeId, position } });
  }

  await revalidate(storeId);
  return { ok: true, at: Date.now() };
}

export async function toggleProductAvailability(storeId: string, productId: string) {
  await requireStoreOwner(storeId);
  const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
  if (!product) return;
  await prisma.product.update({ where: { id: productId }, data: { isAvailable: !product.isAvailable } });
  await revalidate(storeId);
}

export async function deleteProduct(storeId: string, productId: string) {
  await requireStoreOwner(storeId);
  // Pedidos antigos guardam nome e preço, então o histórico continua correto.
  await prisma.product.deleteMany({ where: { id: productId, storeId } });
  await revalidate(storeId);
}

export async function moveProduct(storeId: string, productId: string, dir: -1 | 1) {
  await requireStoreOwner(storeId);
  const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
  if (!product) return;
  const list = await prisma.product.findMany({
    where: { storeId, categoryId: product.categoryId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  await swap(list, productId, dir, (id, position) => prisma.product.update({ where: { id }, data: { position } }));
  await revalidate(storeId);
}
