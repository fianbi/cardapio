import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedStore = {
  slug: string;
  name: string;
  description: string;
  cuisines: string[];
  hours: { opensAt: string; closesAt: string };
  deliveryFeeCents: number;
  acceptsDineIn?: boolean;
  menu: { category: string; products: { name: string; description?: string; priceCents: number; isAvailable?: boolean }[] }[];
};

// Dados de exemplo para desenvolvimento.
const STORES: SeedStore[] = [
  {
    slug: "lanchonete-exemplo",
    name: "Lanchonete Exemplo",
    description: "Lanches artesanais, porções e bebidas.",
    cuisines: ["lanches", "porções"],
    hours: { opensAt: "18:00", closesAt: "02:00" }, // passa da meia-noite
    deliveryFeeCents: 500,
    menu: [
      {
        category: "Lanches",
        products: [
          { name: "X-Burger", description: "Pão, hambúrguer, queijo e salada.", priceCents: 2200 },
          { name: "X-Bacon", description: "Pão, hambúrguer, queijo, bacon e salada.", priceCents: 2600 },
          { name: "X-Tudo", description: "O completo da casa.", priceCents: 3200, isAvailable: false },
        ],
      },
      {
        category: "Bebidas",
        products: [
          { name: "Refrigerante lata", priceCents: 600 },
          { name: "Suco natural 500ml", priceCents: 900 },
        ],
      },
    ],
  },
  {
    slug: "pastelaria-da-praca",
    name: "Pastelaria da Praça",
    description: "Pastéis fritos na hora e caldo de cana.",
    cuisines: ["pastel", "lanches"],
    hours: { opensAt: "08:00", closesAt: "22:00" },
    deliveryFeeCents: 0,
    acceptsDineIn: true,
    menu: [
      {
        category: "Pastéis",
        products: [
          { name: "Pastel de carne", priceCents: 1000 },
          { name: "Pastel de queijo", priceCents: 900 },
          { name: "Pastel de frango com catupiry", priceCents: 1100 },
        ],
      },
      {
        category: "Bebidas",
        products: [{ name: "Caldo de cana 500ml", priceCents: 800 }],
      },
    ],
  },
];

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: "dono@exemplo.com" },
    update: {},
    create: { email: "dono@exemplo.com", name: "Dono de Exemplo", role: "STORE_OWNER" },
  });

  for (const s of STORES) {
    const exists = await prisma.store.findUnique({ where: { slug: s.slug } });
    if (exists) continue;

    await prisma.store.create({
      data: {
        slug: s.slug,
        name: s.name,
        description: s.description,
        cuisines: s.cuisines,
        city: "Minha Cidade",
        state: "SP",
        whatsapp: "5511999999999",
        deliveryFeeCents: s.deliveryFeeCents,
        acceptsDineIn: s.acceptsDineIn ?? false,
        approvalStatus: "APPROVED",
        ownerId: owner.id,
        openingHours: {
          create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, ...s.hours })),
        },
        categories: {
          create: s.menu.map((c, ci) => ({
            name: c.category,
            position: ci,
          })),
        },
      },
    });

    const store = await prisma.store.findUniqueOrThrow({ where: { slug: s.slug }, include: { categories: true } });
    for (const c of s.menu) {
      const category = store.categories.find((x) => x.name === c.category)!;
      await prisma.product.createMany({
        data: c.products.map((p, pi) => ({ ...p, storeId: store.id, categoryId: category.id, position: pi })),
      });
    }
    // Exemplo de adicionais nos lanches "X-...": ponto da carne (obrigatório) e extras (opcionais).
    const burgers = await prisma.product.findMany({ where: { storeId: store.id, name: { startsWith: "X-" } } });
    for (const burger of burgers) {
      await prisma.optionGroup.create({
        data: {
          productId: burger.id,
          name: "Ponto da carne",
          minSelect: 1,
          maxSelect: 1,
          position: 0,
          options: {
            create: ["Mal passado", "Ao ponto", "Bem passado"].map((name, position) => ({ name, position })),
          },
        },
      });
      await prisma.optionGroup.create({
        data: {
          productId: burger.id,
          name: "Adicionais",
          minSelect: 0,
          maxSelect: 3,
          position: 1,
          options: {
            create: [
              { name: "Bacon", priceCents: 400, position: 0 },
              { name: "Ovo", priceCents: 200, position: 1 },
              { name: "Cheddar", priceCents: 300, position: 2 },
            ],
          },
        },
      });
    }
    console.log(`Criada: ${s.name}`);
  }
}

main()
  .then(() => console.log("Seed concluído."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
