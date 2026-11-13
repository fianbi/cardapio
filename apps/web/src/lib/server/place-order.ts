import "server-only";
import { prisma, type OrderType, type PaymentMethod } from "@cardapio/db";
import { buildOrderItems, createOrder, type CartLine } from "./orders";
import { isPublicStore } from "./stores";
import { isOpenNow } from "../hours";
import { formatPrice } from "../format";

export type PlaceOrderInput = {
  storeSlug: string;
  type: OrderType;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  notes?: string;
  changeFor?: string; // "50" ou "50,00"
  items: CartLine[];
};

export type PlaceOrderResult = { ok: true; orderId: string } | { ok: false; error: string };

const ORDER_TYPES: OrderType[] = ["DELIVERY", "PICKUP", "DINE_IN"];
const PAYMENT_METHODS: PaymentMethod[] = ["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD"];

function parseCents(value?: string) {
  if (!String(value ?? "").trim()) return null;
  const raw = String(value);
  const n = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : NaN;
}

/** Cria o pedido de um cliente logado. Usado pelo site (server action) e pelo app (API). */
export async function placeOrder(userId: string, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const name = String(input.customerName ?? "").trim();
  const phone = String(input.customerPhone ?? "").replace(/\D/g, "");
  if (!name) return { ok: false, error: "Informe seu nome." };
  if (phone.length < 10 || phone.length > 13) return { ok: false, error: "Informe um telefone com DDD." };
  if (!ORDER_TYPES.includes(input.type)) return { ok: false, error: "Escolha como quer receber o pedido." };
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) return { ok: false, error: "Escolha a forma de pagamento." };

  const items = (Array.isArray(input.items) ? input.items : []).filter(
    (i) => Number.isInteger(i?.quantity) && i.quantity > 0 && i.quantity <= 99,
  );
  if (items.length === 0) return { ok: false, error: "Seu carrinho está vazio." };

  const store = await prisma.store.findUnique({
    where: { slug: String(input.storeSlug ?? "") },
    include: { openingHours: true },
  });
  if (!store || !isPublicStore(store)) return { ok: false, error: "Loja não encontrada." };
  if (!isOpenNow(store.openingHours)) {
    return { ok: false, error: "A loja fechou. Tente novamente no horário de funcionamento." };
  }
  if (store.isPaused) {
    return { ok: false, error: "A loja pausou os pedidos por alguns minutos. Tente novamente daqui a pouco." };
  }

  const allowed =
    (input.type === "DELIVERY" && store.acceptsDelivery) ||
    (input.type === "PICKUP" && store.acceptsPickup) ||
    (input.type === "DINE_IN" && store.acceptsDineIn);
  if (!allowed) return { ok: false, error: "Esta loja não atende dessa forma." };

  const address = String(input.deliveryAddress ?? "").trim();
  if (input.type === "DELIVERY" && !address) return { ok: false, error: "Informe o endereço de entrega." };

  // Preços sempre vêm do banco, nunca do navegador ou do app.
  const built = await buildOrderItems(store.id, items);
  if (!built.ok) return built;
  const { items: orderItems, subtotalCents } = built;
  if (subtotalCents < store.minOrderCents) {
    return { ok: false, error: `O pedido mínimo desta loja é ${formatPrice(store.minOrderCents)}.` };
  }
  const deliveryFeeCents = input.type === "DELIVERY" ? store.deliveryFeeCents : 0;
  const totalCents = subtotalCents + deliveryFeeCents;

  let changeForCents: number | null = null;
  if (input.paymentMethod === "CASH") {
    changeForCents = parseCents(input.changeFor);
    if (Number.isNaN(changeForCents)) return { ok: false, error: "Valor do troco inválido." };
    if (changeForCents !== null && changeForCents < totalCents) {
      return { ok: false, error: `O troco deve ser para um valor maior que ${formatPrice(totalCents)}.` };
    }
  }

  try {
    const order = await createOrder({
      storeId: store.id,
      customerId: userId,
      type: input.type,
      customerName: name.slice(0, 100),
      customerPhone: phone,
      deliveryAddress: input.type === "DELIVERY" ? address.slice(0, 300) : null,
      notes: String(input.notes ?? "").trim().slice(0, 500) || null,
      paymentMethod: input.paymentMethod,
      changeForCents,
      subtotalCents,
      deliveryFeeCents,
      totalCents,
      items: { create: orderItems },
    });

    // Guarda o telefone para preencher automaticamente da próxima vez.
    await prisma.user.update({ where: { id: userId }, data: { phone } }).catch(() => {});
    return { ok: true, orderId: order.id };
  } catch (e) {
    console.error("Erro ao criar pedido", e);
    return { ok: false, error: "Não foi possível enviar o pedido. Tente novamente." };
  }
}
