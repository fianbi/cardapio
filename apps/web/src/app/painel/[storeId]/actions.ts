"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma, type OrderStatus } from "@cardapio/db";
import { changeOrderStatus } from "@/lib/server/order-status";
import { requireStoreOwner } from "@/lib/store-auth";
import { CANCEL_REASONS, ESTIMATE_OPTIONS } from "@/lib/orders";
import { notifyOrderStatus } from "@/lib/server/push";

async function finish(storeId: string, orderId: string, changed: boolean) {
  if (changed) after(() => notifyOrderStatus(orderId));
  revalidatePath(`/painel/${storeId}`);
}

export async function updateOrderStatus(storeId: string, orderId: string, status: OrderStatus) {
  await requireStoreOwner(storeId);
  await finish(storeId, orderId, await changeOrderStatus(storeId, orderId, status));
}

/** Aceita o pedido informando o tempo estimado (minutos). */
export async function acceptOrder(storeId: string, orderId: string, form: FormData) {
  await requireStoreOwner(storeId);
  const minutes = Number(form.get("minutes"));
  const estimatedMinutes = ESTIMATE_OPTIONS.includes(minutes) ? minutes : null;
  await finish(storeId, orderId, await changeOrderStatus(storeId, orderId, "CONFIRMED", { estimatedMinutes }));
}

/** Recusa ou cancela o pedido com um motivo que o cliente vê. */
export async function cancelOrder(storeId: string, orderId: string, form: FormData) {
  await requireStoreOwner(storeId);
  const reason = String(form.get("reason") ?? "");
  const other = String(form.get("other") ?? "").trim();
  const cancelReason = other || (CANCEL_REASONS.includes(reason) ? reason : null);
  await finish(storeId, orderId, await changeOrderStatus(storeId, orderId, "CANCELED", { cancelReason }));
}

/** Pausa ou retoma o recebimento de pedidos pelo app/site (as mesas continuam funcionando). */
export async function setPaused(storeId: string, paused: boolean) {
  const { store } = await requireStoreOwner(storeId);
  await prisma.store.update({ where: { id: storeId }, data: { isPaused: paused } });
  revalidatePath(`/painel/${storeId}`, "layout");
  revalidatePath(`/lojas/${store.slug}`);
}
