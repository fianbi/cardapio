import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Dados de exemplo para desenvolvimento.
async function main() {
  const owner = await prisma.user.upsert({
    where: { email: "dono@exemplo.com" },
    update: {},
    create: { email: "dono@exemplo.com", name: "Dono de Exemplo", role: "STORE_OWNER" },
  });

  const store = await prisma.store.upsert({
    where: { slug: "lanchonete-exemplo" },
    update: {},
    create: {
      slug: "lanchonete-exemplo",
      name: "Lanchonete Exemplo",
      description: "Lanches artesanais, porções e bebidas.",
      cuisines: ["lanches", "porções"],
      city: "Minha Cidade",
      state: "SP",
      whatsapp: "5511999999999",
      deliveryFeeCents: 500,
      ownerId: owner.id,
      openingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          opensAt: "18:00",
          closesAt: "23:30",
        })),
      },
    },
  });

  const existing = await prisma.menuCategory.count({ where: { storeId: store.id } });
  if (existing > 0) return;

  const lanches = await prisma.menuCategory.create({
    data: { storeId: store.id, name: "Lanches", position: 0 },
  });
  const bebidas = await prisma.menuCategory.create({
    data: { storeId: store.id, name: "Bebidas", position: 1 },
  });

  await prisma.product.createMany({
    data: [
      { storeId: store.id, categoryId: lanches.id, name: "X-Burger", description: "Pão, hambúrguer, queijo e salada.", priceCents: 2200, position: 0 },
      { storeId: store.id, categoryId: lanches.id, name: "X-Bacon", description: "Pão, hambúrguer, queijo, bacon e salada.", priceCents: 2600, position: 1 },
      { storeId: store.id, categoryId: lanches.id, name: "X-Tudo", description: "O completo da casa.", priceCents: 3200, position: 2, isAvailable: false },
      { storeId: store.id, categoryId: bebidas.id, name: "Refrigerante lata", priceCents: 600, position: 0 },
      { storeId: store.id, categoryId: bebidas.id, name: "Suco natural 500ml", priceCents: 900, position: 1 },
    ],
  });
}

main()
  .then(() => console.log("Seed concluído."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
