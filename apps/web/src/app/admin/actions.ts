"use server";

import { revalidatePath } from "next/cache";
import { prisma, type StoreApproval } from "@cardapio/db";
import { requireAdmin } from "@/lib/store-auth";

const STATUSES: StoreApproval[] = ["PENDING", "APPROVED", "SUSPENDED"];

/** Aprova, suspende ou reativa uma loja. */
export async function setStoreApproval(storeId: string, status: StoreApproval) {
  await requireAdmin();
  if (!STATUSES.includes(status)) return;
  const store = await prisma.store.update({ where: { id: storeId }, data: { approvalStatus: status }, select: { slug: true } });
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  revalidatePath(`/lojas/${store.slug}`);
}
