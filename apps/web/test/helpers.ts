import { prisma } from "@cardapio/db";

/** Apaga tudo entre os testes. */
export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE "OrderItemOption","OrderItem","Order","Tab","DiningTable","RecipeItem","Ingredient","Option","OptionGroup","Product","MenuCategory","OpeningHour","Store","Address","PushToken","ApiToken","Account","Session","User" RESTART IDENTITY CASCADE`,
  );
}

/**
 * Loja aprovada, publicada e aberta 24h, com:
 * - X-Burger (R$ 20) com "Ponto" obrigatório (escolha 1) e "Adicionais" opcionais (até 2): Bacon +4, Ovo +2, Cheddar +3 (em falta)
 * - Refrigerante (R$ 6) sem opções
 * - X-Tudo (R$ 30) em falta
 */
export async function createStore(overrides: Record<string, unknown> = {}) {
  const owner = await prisma.user.create({ data: { email: `dono-${Date.now()}-${Math.random()}@teste.com`, role: "STORE_OWNER" } });
  const store = await prisma.store.create({
    data: {
      slug: `loja-${Math.random().toString(36).slice(2, 8)}`,
      name: "Lanchonete Teste",
      city: "Cidade",
      state: "SP",
      cuisines: ["lanches"],
      deliveryFeeCents: 500,
      minOrderCents: 1000,
      isActive: true,
      approvalStatus: "APPROVED",
      ownerId: owner.id,
      // abre e fecha no mesmo horário = aberta o dia todo
      openingHours: { create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: "00:00", closesAt: "00:00" })) },
      ...overrides,
    },
  });
  const category = await prisma.menuCategory.create({ data: { storeId: store.id, name: "Lanches" } });
  const burger = await prisma.product.create({
    data: {
      storeId: store.id,
      categoryId: category.id,
      name: "X-Burger",
      priceCents: 2000,
      optionGroups: {
        create: [
          {
            name: "Ponto",
            minSelect: 1,
            maxSelect: 1,
            position: 0,
            options: { create: [{ name: "Ao ponto", position: 0 }, { name: "Bem passado", position: 1 }] },
          },
          {
            name: "Adicionais",
            minSelect: 0,
            maxSelect: 2,
            position: 1,
            options: {
              create: [
                { name: "Bacon", priceCents: 400, position: 0 },
                { name: "Ovo", priceCents: 200, position: 1 },
                { name: "Cheddar", priceCents: 300, position: 2, isAvailable: false },
              ],
            },
          },
        ],
      },
    },
    include: { optionGroups: { include: { options: true } } },
  });
  const soda = await prisma.product.create({
    data: { storeId: store.id, categoryId: category.id, name: "Refrigerante", priceCents: 600, position: 1 },
  });
  const soldOut = await prisma.product.create({
    data: { storeId: store.id, categoryId: category.id, name: "X-Tudo", priceCents: 3000, position: 2, isAvailable: false },
  });
  const option = (name: string) => burger.optionGroups.flatMap((g) => g.options).find((o) => o.name === name)!.id;
  return { owner, store, category, burger, soda, soldOut, option };
}

export function createCustomer(email = "cliente@teste.com") {
  return prisma.user.create({ data: { email, name: "Cliente Teste" } });
}

/** Monta uma Request para chamar os handlers da API direto, sem subir o servidor. */
export function request(method: string, path: string, options: { token?: string; body?: unknown } = {}) {
  return new Request(`http://localhost:3001${path}`, {
    method,
    headers: {
      host: "localhost:3001",
      "content-type": "application/json",
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}
