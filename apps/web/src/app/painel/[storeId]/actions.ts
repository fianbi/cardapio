"use server";

import { revalidatePath } from "next/cache";
import { prisma, type OrderStatus } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { nextStatuses } from "@/lib/orders";

export async function updateOrderStatus(storeId: string, orderId: string, status: OrderStatus) {
  await requireStoreOwner(storeId);
  const order = await prisma.order.findFirst({ where: { id: orderId, storeId } });
  if (!order) return;
  if (!nextStatuses(order.status, order.type).includes(status)) return;

  // Só atualiza se ninguém mudou o status nesse meio-tempo (ex.: dois atendentes).
  await prisma.order.updateMany({ where: { id: orderId, status: order.status }, data: { status } });
  revalidatePath(`/painel/${storeId}`);
}
