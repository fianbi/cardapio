"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, type PaymentMethod } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { parsePriceToCents } from "@/lib/format";
import { buildOrderItems, createOrder, type CartLine } from "@/lib/server/orders";
import { openTab, serviceFee, tabSubtotal } from "@/lib/server/tabs";
import { cancelOrderAndRestock, OutOfStockError } from "@/lib/server/stock";

const PAYMENT_METHODS: PaymentMethod[] = ["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD"];

function revalidate(storeId: string, tabId?: string) {
  revalidatePath(`/painel/${storeId}/comandas`);
  revalidatePath(`/painel/${storeId}`);
  if (tabId) revalidatePath(`/painel/${storeId}/comandas/${tabId}`);
}

export async function openTableTab(storeId: string, tableId: string) {
  await requireStoreOwner(storeId);
  const table = await prisma.diningTable.findFirst({ where: { id: tableId, storeId, isActive: true } });
  if (!table) return;
  const tab = await openTab(storeId, { tableId });
  redirect(`/painel/${storeId}/comandas/${tab.id}`);
}

export async function openLooseTab(storeId: string, form: FormData) {
  await requireStoreOwner(storeId);
  const label = String(form.get("label") ?? "").trim();
  const tab = await openTab(storeId, { label: label || "Balcão" });
  redirect(`/painel/${storeId}/comandas/${tab.id}`);
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Equipe lança itens na comanda: vira um pedido já confirmado, que aparece na fila da cozinha. */
export async function addItemsToTab(storeId: string, tabId: string, lines: CartLine[], notes: string): Promise<ActionResult> {
  await requireStoreOwner(storeId);
  const tab = await prisma.tab.findFirst({ where: { id: tabId, storeId }, include: { table: true } });
  if (!tab || tab.status !== "OPEN") return { ok: false, error: "Esta comanda não está aberta." };

  const built = await buildOrderItems(storeId, lines);
  if (!built.ok) return built;

  try {
    await createOrder({
      storeId,
      tabId,
      type: "DINE_IN",
      status: "CONFIRMED",
      customerName: tab.table?.label ?? tab.label ?? `Comanda ${tab.number}`,
      notes: notes.trim().slice(0, 500) || null,
      subtotalCents: built.subtotalCents,
      totalCents: built.subtotalCents,
      items: { create: built.items },
    });
  } catch (e) {
    if (e instanceof OutOfStockError) return { ok: false, error: e.message };
    throw e;
  }
  revalidate(storeId, tabId);
  return { ok: true };
}

export async function cancelTabOrder(storeId: string, tabId: string, orderId: string) {
  await requireStoreOwner(storeId);
  await cancelOrderAndRestock(orderId, { tabId, storeId, status: { notIn: ["COMPLETED", "CANCELED"] } });
  revalidate(storeId, tabId);
}

export async function renameTab(storeId: string, tabId: string, form: FormData) {
  await requireStoreOwner(storeId);
  const label = String(form.get("label") ?? "").trim().slice(0, 60) || null;
  await prisma.tab.updateMany({ where: { id: tabId, storeId }, data: { label } });
  revalidate(storeId, tabId);
}

export async function closeTab(storeId: string, tabId: string, _prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  const { store } = await requireStoreOwner(storeId);
  const tab = await prisma.tab.findFirst({ where: { id: tabId, storeId }, include: { orders: true } });
  if (!tab || tab.status !== "OPEN") return { ok: false, error: "Esta comanda não está aberta." };

  const paymentMethod = String(form.get("paymentMethod") ?? "") as PaymentMethod;
  if (!PAYMENT_METHODS.includes(paymentMethod)) return { ok: false, error: "Escolha a forma de pagamento." };

  const subtotalCents = tabSubtotal(tab.orders);
  if (subtotalCents === 0) return { ok: false, error: "A comanda está vazia. Use \"Cancelar comanda\"." };
  const serviceFeeCents = form.get("serviceFee") === "on" ? serviceFee(subtotalCents, store.serviceFeePercent) : 0;
  const discountCents = parsePriceToCents(form.get("discount")) ?? 0;
  const totalCents = subtotalCents + serviceFeeCents - discountCents;
  if (totalCents < 0) return { ok: false, error: "O desconto é maior que o total." };

  await prisma.$transaction([
    // Pedidos ainda em andamento são dados como entregues ao fechar a conta.
    prisma.order.updateMany({
      where: { tabId, status: { notIn: ["COMPLETED", "CANCELED"] } },
      data: { status: "COMPLETED" },
    }),
    prisma.tab.update({
      where: { id: tabId },
      data: { status: "CLOSED", closedAt: new Date(), subtotalCents, serviceFeeCents, discountCents, totalCents, paymentMethod },
    }),
  ]);
  revalidate(storeId, tabId);
  return { ok: true };
}

export async function cancelTab(storeId: string, tabId: string) {
  await requireStoreOwner(storeId);
  const tab = await prisma.tab.findFirst({ where: { id: tabId, storeId, status: "OPEN" }, include: { orders: true } });
  if (!tab || tabSubtotal(tab.orders) > 0) return;
  await prisma.tab.update({ where: { id: tabId }, data: { status: "CANCELED", closedAt: new Date() } });
  revalidate(storeId, tabId);
  redirect(`/painel/${storeId}/comandas`);
}
