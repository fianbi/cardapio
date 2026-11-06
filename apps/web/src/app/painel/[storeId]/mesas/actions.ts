"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";

export async function addTables(storeId: string, form: FormData) {
  await requireStoreOwner(storeId);
  const label = String(form.get("label") ?? "").trim().slice(0, 40);
  const quantity = Math.min(Math.max(Number(form.get("quantity") ?? 1) || 1, 1), 50);
  const count = await prisma.diningTable.count({ where: { storeId } });

  // "Mesa" + quantidade 5 cria Mesa N+1 ... Mesa N+5; um nome próprio cria uma mesa só.
  const labels =
    !label || label.toLowerCase() === "mesa"
      ? Array.from({ length: quantity }, (_, i) => `Mesa ${count + i + 1}`)
      : [label];
  await prisma.diningTable.createMany({
    data: labels.map((l, i) => ({ storeId, label: l, position: count + i })),
  });
  revalidatePath(`/painel/${storeId}/mesas`);
}

export async function renameTable(storeId: string, tableId: string, form: FormData) {
  await requireStoreOwner(storeId);
  const label = String(form.get("label") ?? "").trim().slice(0, 40);
  if (!label) return;
  await prisma.diningTable.updateMany({ where: { id: tableId, storeId }, data: { label } });
  revalidatePath(`/painel/${storeId}/mesas`);
}

export async function toggleTable(storeId: string, tableId: string) {
  await requireStoreOwner(storeId);
  const table = await prisma.diningTable.findFirst({ where: { id: tableId, storeId } });
  if (!table) return;
  await prisma.diningTable.update({ where: { id: tableId }, data: { isActive: !table.isActive } });
  revalidatePath(`/painel/${storeId}/mesas`);
  revalidatePath(`/painel/${storeId}/comandas`);
}
