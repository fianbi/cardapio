import "server-only";
import { prisma, type OrderStatus } from "@cardapio/db";
import { nextStatuses } from "../orders";

/**
 * Muda o status de um pedido da loja. Ao aceitar, guarda o tempo estimado; ao cancelar, o motivo.
 * Só atualiza se a transição é permitida e ninguém mudou o status nesse meio-tempo (ex.: dois atendentes).
 * Quem chama é responsável por conferir a permissão do usuário.
 */
export async function changeOrderStatus(
  storeId: string,
  orderId: string,
  status: OrderStatus,
  extra: { estimatedMinutes?: number | null; cancelReason?: string | null } = {},
) {
  const order = await prisma.order.findFirst({ where: { id: orderId, storeId } });
  if (!order) return false;
  if (!nextStatuses(order.status, order.type).includes(status)) return false;

  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: order.status },
    data: {
      status,
      ...(status === "CONFIRMED" ? { confirmedAt: new Date(), estimatedMinutes: extra.estimatedMinutes ?? null } : {}),
      ...(status === "CANCELED" ? { cancelReason: extra.cancelReason?.trim().slice(0, 200) || null } : {}),
    },
  });
  return updated.count > 0;
}
