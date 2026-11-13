import type { OrderStatus, OrderType, PaymentMethod } from "@cardapio/db";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Aguardando a loja",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  READY: "Pronto",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
};

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  DELIVERY: "Entrega",
  PICKUP: "Retirada no local",
  DINE_IN: "Consumo no local",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
};

/** Etapas mostradas na linha do tempo do pedido. */
export function statusSteps(type: OrderType): OrderStatus[] {
  return type === "DELIVERY"
    ? ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "COMPLETED"]
    : ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];
}

/** Próximos status permitidos a partir do atual (o que o lojista pode fazer). */
export function nextStatuses(status: OrderStatus, type: OrderType): OrderStatus[] {
  switch (status) {
    case "PENDING":
      return ["CONFIRMED", "CANCELED"];
    case "CONFIRMED":
      return ["PREPARING", "CANCELED"];
    case "PREPARING":
      return [type === "DELIVERY" ? "OUT_FOR_DELIVERY" : "READY", "CANCELED"];
    case "READY":
    case "OUT_FOR_DELIVERY":
      return ["COMPLETED", "CANCELED"];
    default:
      return [];
  }
}

/** Texto do botão que leva ao status. */
export const STATUS_ACTION_LABEL: Record<OrderStatus, string> = {
  PENDING: "",
  CONFIRMED: "Aceitar pedido",
  PREPARING: "Iniciar preparo",
  READY: "Marcar como pronto",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  COMPLETED: "Concluir",
  CANCELED: "Cancelar",
};

/** Tempos estimados (minutos) que a loja pode informar ao aceitar o pedido. */
export const ESTIMATE_OPTIONS = [15, 20, 30, 40, 50, 60, 90];

/** Motivos prontos para recusar/cancelar um pedido. */
export const CANCEL_REASONS = [
  "Item em falta",
  "Loja muito cheia no momento",
  "Fora da área de entrega",
  "Não conseguimos contato com o cliente",
  "Loja fechando",
];

/** Horário previsto (confirmação + tempo estimado). */
export function estimatedReadyAt(order: { confirmedAt: Date | string | null; estimatedMinutes: number | null }) {
  if (!order.confirmedAt || !order.estimatedMinutes) return null;
  return new Date(new Date(order.confirmedAt).getTime() + order.estimatedMinutes * 60_000);
}
