// Textos e regras de pedido usados pelo site e pelo aplicativo.

export type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELED";
export type OrderType = "DELIVERY" | "PICKUP" | "DINE_IN";
export type PaymentMethod = "PIX" | "CASH" | "CREDIT_CARD" | "DEBIT_CARD";

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

export function isFinished(status: OrderStatus) {
  return status === "COMPLETED" || status === "CANCELED";
}
