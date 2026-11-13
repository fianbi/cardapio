import "server-only";
import { prisma, type OrderStatus } from "@cardapio/db";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Título e texto da notificação para cada mudança de status. `null` = não notifica. */
export function orderPushMessage(order: {
  status: OrderStatus;
  type: string;
  number: number;
  storeName: string;
  estimatedMinutes: number | null;
  cancelReason: string | null;
}): { title: string; body: string } | null {
  const title = `${order.storeName} · pedido #${order.number}`;
  switch (order.status) {
    case "CONFIRMED":
      return {
        title,
        body: order.estimatedMinutes
          ? `Pedido aceito! Previsão de ${order.estimatedMinutes} minutos.`
          : "Pedido aceito pela loja.",
      };
    case "PREPARING":
      return { title, body: "Seu pedido está sendo preparado." };
    case "READY":
      return { title, body: order.type === "PICKUP" ? "Pronto! Já pode retirar." : "Seu pedido está pronto." };
    case "OUT_FOR_DELIVERY":
      return { title, body: "Saiu para entrega." };
    case "COMPLETED":
      return { title, body: "Pedido concluído. Bom apetite!" };
    case "CANCELED":
      return { title, body: order.cancelReason ? `Pedido cancelado: ${order.cancelReason}` : "Pedido cancelado pela loja." };
    default:
      return null;
  }
}

/** Avisa o cliente (app) que o status do pedido mudou. Nunca lança erro: push é melhor esforço. */
export async function notifyOrderStatus(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { select: { name: true } }, customer: { select: { pushTokens: { select: { token: true } } } } },
    });
    const tokens = order?.customer?.pushTokens.map((t) => t.token) ?? [];
    if (!order || tokens.length === 0) return;
    const message = orderPushMessage({ ...order, storeName: order.store.name });
    if (!message) return;
    if (process.env.PUSH_DISABLED === "1") return;

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(
        tokens.map((to) => ({ to, sound: "default", channelId: "pedidos", ...message, data: { orderId } })),
      ),
      signal: AbortSignal.timeout(5000),
    });
    const json = (await res.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
    // Aparelho desinstalou o app ou revogou a permissão: apaga o token.
    const dead = tokens.filter((_, i) => json?.data?.[i]?.details?.error === "DeviceNotRegistered");
    if (dead.length > 0) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
  } catch (e) {
    console.error("Falha ao enviar push", e);
  }
}
