import { beforeEach, describe, expect, it } from "vitest";
import { prisma, type Prisma } from "@cardapio/db";
import { placeOrder, type PlaceOrderInput } from "@/lib/server/place-order";
import { changeOrderStatus } from "@/lib/server/order-status";
import { createCustomer, createStore, resetDb } from "./helpers";

let ctx: Awaited<ReturnType<typeof createStore>>;
let customerId: string;

const order = (overrides: Partial<PlaceOrderInput> = {}): PlaceOrderInput => ({
  storeSlug: ctx.store.slug,
  type: "DELIVERY",
  paymentMethod: "PIX",
  customerName: "Maria",
  customerPhone: "(11) 91234-5678",
  deliveryAddress: "Rua A, 10 - Centro",
  items: [{ productId: ctx.burger.id, quantity: 2, optionIds: [ctx.option("Ao ponto"), ctx.option("Bacon")] }],
  ...overrides,
});

beforeEach(async () => {
  await resetDb();
  ctx = await createStore();
  customerId = (await createCustomer()).id;
});

describe("fazer pedido", () => {
  it("calcula o total pelo preço do banco, com adicionais e taxa de entrega", async () => {
    const result = await placeOrder(customerId, order());
    expect(result.ok).toBe(true);
    const saved = await prisma.order.findFirstOrThrow({ include: { items: { include: { options: true } } } });
    expect(saved.number).toBe(1);
    expect(saved.status).toBe("PENDING");
    expect(saved.items[0].unitPriceCents).toBe(2400); // 20,00 + bacon 4,00
    expect(saved.items[0].options.map((o) => o.optionName)).toEqual(["Ao ponto", "Bacon"]);
    expect(saved.subtotalCents).toBe(4800);
    expect(saved.deliveryFeeCents).toBe(500);
    expect(saved.totalCents).toBe(5300);
    expect(saved.customerPhone).toBe("11912345678");
  });

  it("guarda o telefone do cliente para o próximo pedido", async () => {
    await placeOrder(customerId, order());
    expect((await prisma.user.findUniqueOrThrow({ where: { id: customerId } })).phone).toBe("11912345678");
  });

  it("numera os pedidos em sequência por loja", async () => {
    await placeOrder(customerId, order());
    await placeOrder(customerId, order());
    const numbers = (await prisma.order.findMany({ orderBy: { number: "asc" } })).map((o) => o.number);
    expect(numbers).toEqual([1, 2]);
  });

  it("retirada não cobra entrega nem exige endereço", async () => {
    const result = await placeOrder(customerId, order({ type: "PICKUP", deliveryAddress: "" }));
    expect(result.ok).toBe(true);
    const saved = await prisma.order.findFirstOrThrow();
    expect(saved.deliveryFeeCents).toBe(0);
    expect(saved.deliveryAddress).toBeNull();
  });

  it.each([
    ["sem a opção obrigatória", () => order({ items: [{ productId: ctx.burger.id, quantity: 1, optionIds: [] }] }), "Ponto"],
    [
      "com opção em falta",
      () => order({ items: [{ productId: ctx.burger.id, quantity: 1, optionIds: [ctx.option("Ao ponto"), ctx.option("Cheddar")] }] }),
      "Cheddar",
    ],
    ["com produto em falta", () => order({ items: [{ productId: ctx.soldOut.id, quantity: 1 }] }), "X-Tudo"],
    ["abaixo do pedido mínimo", () => order({ items: [{ productId: ctx.soda.id, quantity: 1 }] }), "mínimo"],
    ["entrega sem endereço", () => order({ deliveryAddress: " " }), "endereço"],
    ["telefone inválido", () => order({ customerPhone: "123" }), "telefone"],
    ["carrinho vazio", () => order({ items: [] }), "vazio"],
    ["quantidade inválida", () => order({ items: [{ productId: ctx.soda.id, quantity: 0 }] }), "vazio"],
    ["forma de atendimento que a loja não oferece", () => order({ type: "DINE_IN" }), "não atende"],
    ["troco menor que o total", () => order({ paymentMethod: "CASH", changeFor: "10,00" }), "troco"],
  ])("recusa pedido %s", async (_name, build, message) => {
    const result = await placeOrder(customerId, build());
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.toLowerCase()).toContain(message.toLowerCase());
    expect(await prisma.order.count()).toBe(0);
  });

  it("aceita troco para um valor maior que o total", async () => {
    const result = await placeOrder(customerId, order({ paymentMethod: "CASH", changeFor: "100" }));
    expect(result.ok).toBe(true);
    expect((await prisma.order.findFirstOrThrow()).changeForCents).toBe(10000);
  });

  it("recusa produto de outra loja", async () => {
    const other = await createStore();
    const result = await placeOrder(customerId, order({ items: [{ productId: other.soda.id, quantity: 5 }] }));
    expect(result.ok).toBe(false);
  });

  it.each<[string, Prisma.StoreUncheckedUpdateInput, string]>([
    ["não aprovada pela plataforma", { approvalStatus: "PENDING" }, "não encontrada"],
    ["suspensa", { approvalStatus: "SUSPENDED" }, "não encontrada"],
    ["em rascunho", { isActive: false }, "não encontrada"],
    ["com pedidos pausados", { isPaused: true }, "pausou"],
  ])("recusa pedido em loja %s", async (_name, data, message) => {
    await prisma.store.update({ where: { id: ctx.store.id }, data });
    const result = await placeOrder(customerId, order());
    expect(!result.ok && result.error).toContain(message);
  });

  it("recusa pedido com a loja fechada", async () => {
    await prisma.openingHour.deleteMany({ where: { storeId: ctx.store.id } });
    const result = await placeOrder(customerId, order());
    expect(!result.ok && result.error).toContain("fechou");
  });

  it("produto com ingrediente em falta não pode ser pedido", async () => {
    await prisma.ingredient.create({
      data: { storeId: ctx.store.id, name: "Pão", available: false, recipes: { create: { productId: ctx.burger.id } } },
    });
    const result = await placeOrder(customerId, order());
    expect(!result.ok && result.error).toContain("X-Burger");
  });
});

describe("andamento do pedido na loja", () => {
  async function newOrder() {
    const result = await placeOrder(customerId, order());
    if (!result.ok) throw new Error(result.error);
    return result.orderId;
  }

  it("aceitar guarda o tempo estimado e a hora da confirmação", async () => {
    const id = await newOrder();
    expect(await changeOrderStatus(ctx.store.id, id, "CONFIRMED", { estimatedMinutes: 30 })).toBe(true);
    const saved = await prisma.order.findUniqueOrThrow({ where: { id } });
    expect(saved.status).toBe("CONFIRMED");
    expect(saved.estimatedMinutes).toBe(30);
    expect(saved.confirmedAt).toBeInstanceOf(Date);
  });

  it("recusar guarda o motivo", async () => {
    const id = await newOrder();
    await changeOrderStatus(ctx.store.id, id, "CANCELED", { cancelReason: "Item em falta" });
    expect(await prisma.order.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: "CANCELED", cancelReason: "Item em falta" });
  });

  it("não pula etapas nem mexe em pedido finalizado", async () => {
    const id = await newOrder();
    expect(await changeOrderStatus(ctx.store.id, id, "COMPLETED")).toBe(false);
    await changeOrderStatus(ctx.store.id, id, "CANCELED");
    expect(await changeOrderStatus(ctx.store.id, id, "CONFIRMED")).toBe(false);
  });

  it("uma loja não altera pedido de outra", async () => {
    const id = await newOrder();
    const other = await createStore();
    expect(await changeOrderStatus(other.store.id, id, "CONFIRMED")).toBe(false);
    expect((await prisma.order.findUniqueOrThrow({ where: { id } })).status).toBe("PENDING");
  });
});
