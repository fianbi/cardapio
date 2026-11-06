"use server";

import { prisma, Prisma, type OrderType, type PaymentMethod } from "@cardapio/db";
import { auth } from "@/auth";
import { isOpenNow } from "@/lib/hours";
import { formatPrice } from "@/lib/format";

export type PlaceOrderInput = {
  storeSlug: string;
  type: OrderType;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  notes?: string;
  changeFor?: string; // "50" ou "50,00"
  items: { productId: string; quantity: number; notes?: string }[];
};

export type PlaceOrderResult = { ok: true; orderId: string } | { ok: false; error: string };

const ORDER_TYPES: OrderType[] = ["DELIVERY", "PICKUP", "DINE_IN"];
const PAYMENT_METHODS: PaymentMethod[] = ["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD"];

function parseCents(value?: string) {
  if (!value?.trim()) return null;
  const n = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : NaN;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Entre com sua conta para finalizar o pedido." };

  const name = input.customerName?.trim();
  const phone = input.customerPhone?.replace(/\D/g, "") ?? "";
  if (!name) return { ok: false, error: "Informe seu nome." };
  if (phone.length < 10 || phone.length > 13) return { ok: false, error: "Informe um telefone com DDD." };
  if (!ORDER_TYPES.includes(input.type)) return { ok: false, error: "Escolha como quer receber o pedido." };
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) return { ok: false, error: "Escolha a forma de pagamento." };

  const items = (input.items ?? []).filter((i) => Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 99);
  if (items.length === 0) return { ok: false, error: "Seu carrinho está vazio." };

  const store = await prisma.store.findUnique({
    where: { slug: input.storeSlug },
    include: { openingHours: true },
  });
  if (!store || !store.isActive) return { ok: false, error: "Loja não encontrada." };
  if (!isOpenNow(store.openingHours)) return { ok: false, error: "A loja fechou. Tente novamente no horário de funcionamento." };

  const allowed =
    (input.type === "DELIVERY" && store.acceptsDelivery) ||
    (input.type === "PICKUP" && store.acceptsPickup) ||
    (input.type === "DINE_IN" && store.acceptsDineIn);
  if (!allowed) return { ok: false, error: "Esta loja não atende dessa forma." };

  const address = input.deliveryAddress?.trim();
  if (input.type === "DELIVERY" && !address) return { ok: false, error: "Informe o endereço de entrega." };

  // Preços sempre vêm do banco, nunca do navegador.
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, storeId: store.id },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const unavailable = items.filter((i) => !byId.get(i.productId)?.isAvailable);
  if (unavailable.length > 0) {
    const names = unavailable.map((i) => byId.get(i.productId)?.name).filter(Boolean);
    return {
      ok: false,
      error: names.length
        ? `Não temos mais: ${names.join(", ")}. Remova do carrinho para continuar.`
        : "Alguns itens do carrinho não existem mais. Remova-os para continuar.",
    };
  }

  const orderItems = items.map((i) => {
    const p = byId.get(i.productId)!;
    return {
      productId: p.id,
      productName: p.name,
      unitPriceCents: p.priceCents,
      quantity: i.quantity,
      notes: i.notes?.trim().slice(0, 200) || null,
    };
  });
  const subtotalCents = orderItems.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
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

  // Número sequencial por loja; se dois pedidos chegarem juntos, tenta de novo.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        const last = await tx.order.findFirst({
          where: { storeId: store.id },
          orderBy: { number: "desc" },
          select: { number: true },
        });
        return tx.order.create({
          data: {
            number: (last?.number ?? 0) + 1,
            storeId: store.id,
            customerId: session.user.id,
            type: input.type,
            customerName: name.slice(0, 100),
            customerPhone: phone,
            deliveryAddress: input.type === "DELIVERY" ? address!.slice(0, 300) : null,
            notes: input.notes?.trim().slice(0, 500) || null,
            paymentMethod: input.paymentMethod,
            changeForCents,
            subtotalCents,
            deliveryFeeCents,
            totalCents,
            items: { create: orderItems },
          },
          select: { id: true },
        });
      });

      // Guarda o telefone para preencher automaticamente da próxima vez.
      await prisma.user.update({ where: { id: session.user.id }, data: { phone } }).catch(() => {});
      return { ok: true, orderId: order.id };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      console.error("Erro ao criar pedido", e);
      return { ok: false, error: "Não foi possível enviar o pedido. Tente novamente." };
    }
  }
  return { ok: false, error: "A loja está recebendo muitos pedidos agora. Tente novamente em instantes." };
}
