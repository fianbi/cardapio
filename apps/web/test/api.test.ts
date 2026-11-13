import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@cardapio/db";
import { POST as devLogin } from "@/app/api/v1/auth/dev/route";
import { POST as googleLogin } from "@/app/api/v1/auth/google/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { DELETE as deleteMe, GET as getMe, PATCH as patchMe } from "@/app/api/v1/me/route";
import { GET as getStores } from "@/app/api/v1/stores/route";
import { GET as getStore } from "@/app/api/v1/stores/[slug]/route";
import { GET as getOrders, POST as postOrder } from "@/app/api/v1/orders/route";
import { GET as getOrderById } from "@/app/api/v1/orders/[id]/route";
import { GET as getAddresses, POST as postAddress } from "@/app/api/v1/addresses/route";
import { DELETE as deleteAddress } from "@/app/api/v1/addresses/[id]/route";
import { POST as postPushToken } from "@/app/api/v1/push-token/route";
import { hashToken } from "@/lib/server/mobile-auth";
import { changeOrderStatus } from "@/lib/server/order-status";
import { createStore, request, resetDb } from "./helpers";

let ctx: Awaited<ReturnType<typeof createStore>>;

async function login(email = "cliente@teste.com") {
  const res = await devLogin(request("POST", "/api/v1/auth/dev", { body: { email, name: "Cliente" } }));
  expect(res.status).toBe(200);
  return (await res.json()).token as string;
}

const orderBody = () => ({
  storeSlug: ctx.store.slug,
  type: "DELIVERY",
  paymentMethod: "CASH",
  changeFor: "100",
  customerName: "Cliente",
  customerPhone: "11912345678",
  deliveryAddress: "Rua A, 10 - Centro",
  items: [
    { productId: ctx.burger.id, quantity: 1, optionIds: [ctx.option("Bem passado"), ctx.option("Ovo")], notes: "sem cebola" },
    { productId: ctx.soda.id, quantity: 2 },
  ],
});

const slugParams = (slug: string) => ({ params: Promise.resolve({ slug }) });
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(async () => {
  await resetDb();
  ctx = await createStore();
});

describe("login do app", () => {
  it("o token dá acesso à conta e só o hash fica no banco", async () => {
    const token = await login();
    const me = await getMe(request("GET", "/api/v1/me", { token }));
    expect((await me.json()).user).toMatchObject({ email: "cliente@teste.com", name: "Cliente" });
    const saved = await prisma.apiToken.findFirstOrThrow();
    expect(saved.tokenHash).toBe(hashToken(token));
    expect(saved.tokenHash).not.toBe(token);
  });

  it("sem token, com token inválido ou vencido responde 401", async () => {
    expect((await getMe(request("GET", "/api/v1/me"))).status).toBe(401);
    expect((await getMe(request("GET", "/api/v1/me", { token: "invalido" }))).status).toBe(401);
    const token = await login();
    await prisma.apiToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await getMe(request("GET", "/api/v1/me", { token }))).status).toBe(401);
  });

  it("sair invalida o token", async () => {
    const token = await login();
    await logout(request("POST", "/api/v1/auth/logout", { token }));
    expect((await getMe(request("GET", "/api/v1/me", { token }))).status).toBe(401);
  });

  it("token do Google inválido é recusado", async () => {
    const res = await googleLogin(request("POST", "/api/v1/auth/google", { body: { idToken: "abc.def.ghi" } }));
    expect(res.status).toBe(401);
    expect(await prisma.user.count({ where: { role: "CUSTOMER" } })).toBe(0);
  });

  it("login de desenvolvimento fica desligado sem ALLOW_DEV_LOGIN", async () => {
    process.env.ALLOW_DEV_LOGIN = "0";
    try {
      const res = await devLogin(request("POST", "/api/v1/auth/dev", { body: { email: "x@teste.com" } }));
      expect(res.status).toBe(404);
    } finally {
      process.env.ALLOW_DEV_LOGIN = "1";
    }
  });

  it("atualiza nome e telefone, validando o telefone", async () => {
    const token = await login();
    expect((await patchMe(request("PATCH", "/api/v1/me", { token, body: { phone: "123" } }))).status).toBe(400);
    const res = await patchMe(request("PATCH", "/api/v1/me", { token, body: { name: "Maria", phone: "(11) 91234-5678" } }));
    expect((await res.json()).user).toMatchObject({ name: "Maria", phone: "11912345678" });
  });
});

describe("lojas e cardápio", () => {
  it("lista só lojas aprovadas e publicadas", async () => {
    await createStore({ name: "Pendente", approvalStatus: "PENDING" });
    await createStore({ name: "Rascunho", isActive: false });
    const json = await (await getStores(request("GET", "/api/v1/stores"))).json();
    expect(json.stores.map((s: { name: string }) => s.name)).toEqual(["Lanchonete Teste"]);
    expect(json.stores[0]).toMatchObject({ isOpen: true, isPaused: false, deliveryFeeCents: 500 });
    expect(json.cuisines).toEqual(["lanches"]);
  });

  it("busca por nome de produto e filtra por tipo de comida", async () => {
    await createStore({ name: "Pizzaria", cuisines: ["pizza"] });
    const byProduct = await (await getStores(request("GET", "/api/v1/stores?q=x-burger"))).json();
    expect(byProduct.stores).toHaveLength(2);
    const byCuisine = await (await getStores(request("GET", "/api/v1/stores?tipo=pizza"))).json();
    expect(byCuisine.stores.map((s: { name: string }) => s.name)).toEqual(["Pizzaria"]);
    const none = await (await getStores(request("GET", "/api/v1/stores?q=sushi"))).json();
    expect(none.stores).toEqual([]);
  });

  it("cardápio traz produtos, adicionais e disponibilidade", async () => {
    const res = await getStore(request("GET", `/api/v1/stores/${ctx.store.slug}`), slugParams(ctx.store.slug));
    const { store } = await res.json();
    const products = store.categories[0].products;
    expect(products.map((p: { name: string; isAvailable: boolean }) => [p.name, p.isAvailable])).toEqual([
      ["X-Burger", true],
      ["Refrigerante", true],
      ["X-Tudo", false],
    ]);
    expect(products[0].optionGroups.map((g: { name: string; minSelect: number; maxSelect: number }) => [g.name, g.minSelect, g.maxSelect])).toEqual([
      ["Ponto", 1, 1],
      ["Adicionais", 0, 2],
    ]);
    expect(products[0].optionGroups[1].options[2]).toMatchObject({ name: "Cheddar", isAvailable: false, priceCents: 300 });
  });

  it("foto enviada pelo painel vira URL completa para o app", async () => {
    await prisma.product.update({ where: { id: ctx.soda.id }, data: { imageUrl: "/uploads/lojas/x/foto.jpg" } });
    const res = await getStore(request("GET", `/api/v1/stores/${ctx.store.slug}`), slugParams(ctx.store.slug));
    const { store } = await res.json();
    expect(store.categories[0].products[1].imageUrl).toBe("http://localhost:3001/uploads/lojas/x/foto.jpg");
  });

  it("loja suspensa ou inexistente responde 404", async () => {
    await prisma.store.update({ where: { id: ctx.store.id }, data: { approvalStatus: "SUSPENDED" } });
    expect((await getStore(request("GET", "/x"), slugParams(ctx.store.slug))).status).toBe(404);
    expect((await getStore(request("GET", "/x"), slugParams("nao-existe"))).status).toBe(404);
  });
});

describe("pedidos pelo app", () => {
  it("exige login", async () => {
    expect((await postOrder(request("POST", "/api/v1/orders", { body: orderBody() }))).status).toBe(401);
  });

  it("cria o pedido, lista e acompanha até a loja aceitar", async () => {
    const token = await login();
    const created = await postOrder(request("POST", "/api/v1/orders", { token, body: orderBody() }));
    expect(created.status).toBe(201);
    const { order } = await created.json();
    expect(order).toMatchObject({
      number: 1,
      status: "PENDING",
      subtotalCents: 2200 + 1200, // burger 20 + ovo 2; 2 refrigerantes
      deliveryFeeCents: 500,
      totalCents: 3900,
      changeForCents: 10000,
      estimatedReadyAt: null,
    });
    expect(order.items[0]).toMatchObject({ productName: "X-Burger", unitPriceCents: 2200, notes: "sem cebola" });
    expect(order.items[0].options.map((o: { optionName: string }) => o.optionName)).toEqual(["Bem passado", "Ovo"]);
    expect(order.steps).toEqual(["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "COMPLETED"]);

    await changeOrderStatus(ctx.store.id, order.id, "CONFIRMED", { estimatedMinutes: 40 });
    const tracked = await (await getOrderById(request("GET", "/x", { token }), idParams(order.id))).json();
    expect(tracked.order).toMatchObject({ status: "CONFIRMED", estimatedMinutes: 40 });
    expect(tracked.order.estimatedReadyAt).toEqual(expect.any(String));

    const list = await (await getOrders(request("GET", "/api/v1/orders", { token }))).json();
    expect(list.orders).toHaveLength(1);
  });

  it("pedido inválido responde 422 com a mensagem para o cliente", async () => {
    const token = await login();
    const res = await postOrder(
      request("POST", "/api/v1/orders", { token, body: { ...orderBody(), items: [{ productId: ctx.burger.id, quantity: 1 }] } }),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("Ponto");
  });

  it("corpo malformado não derruba a API", async () => {
    const token = await login();
    const res = await postOrder(request("POST", "/api/v1/orders", { token, body: { items: "x", type: 5 } }));
    expect(res.status).toBe(422);
  });

  it("um cliente não vê o pedido de outro", async () => {
    const token = await login();
    const { order } = await (await postOrder(request("POST", "/api/v1/orders", { token, body: orderBody() }))).json();
    const other = await login("outro@teste.com");
    expect((await getOrderById(request("GET", "/x", { token: other }), idParams(order.id))).status).toBe(404);
    expect((await (await getOrders(request("GET", "/x", { token: other }))).json()).orders).toEqual([]);
  });
});

describe("endereços, notificações e exclusão da conta", () => {
  it("salva, lista e apaga endereços do próprio cliente", async () => {
    const token = await login();
    expect((await postAddress(request("POST", "/x", { token, body: { street: "Rua A" } }))).status).toBe(400);
    const created = await postAddress(
      request("POST", "/x", { token, body: { label: "Casa", street: "Rua A", number: "10", district: "Centro", reference: "padaria" } }),
    );
    const { address } = await created.json();
    expect(address.formatted).toBe("Rua A, 10 - Centro · Ref.: padaria");

    const other = await login("outro@teste.com");
    expect((await deleteAddress(request("DELETE", "/x", { token: other }), idParams(address.id))).status).toBe(404);
    expect((await (await getAddresses(request("GET", "/x", { token }))).json()).addresses).toHaveLength(1);
    expect((await deleteAddress(request("DELETE", "/x", { token }), idParams(address.id))).status).toBe(200);
    expect((await (await getAddresses(request("GET", "/x", { token }))).json()).addresses).toEqual([]);
  });

  it("registra o aparelho para push e passa o token para quem logou por último", async () => {
    const token = await login();
    expect((await postPushToken(request("POST", "/x", { token, body: { token: "qualquer", platform: "android" } }))).status).toBe(400);
    const push = "ExponentPushToken[abc123]";
    await postPushToken(request("POST", "/x", { token, body: { token: push, platform: "android" } }));
    const other = await login("outro@teste.com");
    await postPushToken(request("POST", "/x", { token: other, body: { token: push, platform: "android" } }));
    const saved = await prisma.pushToken.findMany({ include: { user: true } });
    expect(saved).toHaveLength(1);
    expect(saved[0].user.email).toBe("outro@teste.com");
  });

  it("excluir a conta apaga os dados pessoais e mantém o pedido anônimo para a loja", async () => {
    const token = await login();
    await postOrder(request("POST", "/api/v1/orders", { token, body: orderBody() }));
    expect((await deleteMe(request("DELETE", "/api/v1/me", { token }))).status).toBe(200);

    expect(await prisma.user.count({ where: { email: "cliente@teste.com" } })).toBe(0);
    expect(await prisma.apiToken.count()).toBe(0);
    const order = await prisma.order.findFirstOrThrow();
    expect(order).toMatchObject({ customerId: null, customerPhone: null, deliveryAddress: null, customerName: "Cliente removido" });
    expect((await getMe(request("GET", "/api/v1/me", { token }))).status).toBe(401);
  });

  it("dono de loja não exclui a conta pelo app", async () => {
    const token = await login(ctx.owner.email!);
    expect((await deleteMe(request("DELETE", "/api/v1/me", { token }))).status).toBe(409);
    expect(await prisma.store.count()).toBe(1);
  });
});
