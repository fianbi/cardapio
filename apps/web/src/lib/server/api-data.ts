import "server-only";
import { prisma, type Prisma } from "@cardapio/db";
import { isOpenNow, todayLabel } from "../hours";
import { hasUnsatisfiableGroup } from "@cardapio/shared/options";
import { estimatedReadyAt, statusSteps } from "../orders";
import { getMissingIngredients } from "./ingredients";
import { PUBLIC_STORE } from "./stores";
import { absoluteUrl } from "./api";

// Formato dos dados que a API entrega ao aplicativo.

export async function listStores(req: Request, filters: { q?: string; cuisine?: string; onlyOpen?: boolean }) {
  const where: Prisma.StoreWhereInput = { ...PUBLIC_STORE };
  const term = filters.q?.trim();
  if (term) {
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { products: { some: { name: { contains: term, mode: "insensitive" } } } },
    ];
  }
  if (filters.cuisine) where.cuisines = { has: filters.cuisine };

  const [stores, allCuisines] = await Promise.all([
    prisma.store.findMany({ where, orderBy: { name: "asc" }, include: { openingHours: true } }),
    prisma.store.findMany({ where: PUBLIC_STORE, select: { cuisines: true } }),
  ]);

  return {
    cuisines: [...new Set(allCuisines.flatMap((s) => s.cuisines))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    stores: stores
      .map((s) => storeSummary(req, s))
      .filter((s) => !filters.onlyOpen || s.isOpen)
      .sort((a, b) => Number(b.isOpen) - Number(a.isOpen)),
  };
}

type StoreWithHours = Prisma.StoreGetPayload<{ include: { openingHours: true } }>;

function storeSummary(req: Request, s: StoreWithHours) {
  return {
    slug: s.slug,
    name: s.name,
    description: s.description,
    logoUrl: absoluteUrl(req, s.logoUrl),
    cuisines: s.cuisines,
    city: s.city,
    district: s.district,
    isOpen: isOpenNow(s.openingHours),
    isPaused: s.isPaused,
    todayLabel: todayLabel(s.openingHours),
    acceptsDelivery: s.acceptsDelivery,
    acceptsPickup: s.acceptsPickup,
    acceptsDineIn: s.acceptsDineIn,
    deliveryFeeCents: s.deliveryFeeCents,
    minOrderCents: s.minOrderCents,
  };
}

/** Loja com o cardápio completo (categorias, produtos, adicionais e disponibilidade). */
export async function getStoreMenu(req: Request, slug: string) {
  const store = await prisma.store.findFirst({
    where: { slug, ...PUBLIC_STORE },
    include: {
      openingHours: true,
      categories: {
        orderBy: { position: "asc" },
        include: {
          products: {
            orderBy: { position: "asc" },
            include: {
              optionGroups: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } },
            },
          },
        },
      },
    },
  });
  if (!store) return null;
  const missing = await getMissingIngredients(store.id);

  return {
    ...storeSummary(req, store),
    phone: store.phone,
    address: [store.street && `${store.street}, ${store.number ?? "s/n"}`, store.district, `${store.city}/${store.state}`]
      .filter(Boolean)
      .join(" - "),
    hours: store.openingHours
      .map((h) => ({ weekday: h.weekday, opensAt: h.opensAt, closesAt: h.closesAt }))
      .sort((a, b) => a.weekday - b.weekday),
    categories: store.categories
      .filter((c) => c.products.length > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        products: c.products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          priceCents: p.priceCents,
          imageUrl: absoluteUrl(req, p.imageUrl),
          isAvailable: p.isAvailable && !missing.has(p.id) && !hasUnsatisfiableGroup(p.optionGroups),
          optionGroups: p.optionGroups.map((g) => ({
            id: g.id,
            name: g.name,
            minSelect: g.minSelect,
            maxSelect: g.maxSelect,
            options: g.options.map((o) => ({ id: o.id, name: o.name, priceCents: o.priceCents, isAvailable: o.isAvailable })),
          })),
        })),
      })),
  };
}

const ORDER_INCLUDE = {
  items: { include: { options: true } },
  store: { select: { name: true, slug: true, phone: true, logoUrl: true } },
} satisfies Prisma.OrderInclude;

type OrderFull = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

export function orderJson(req: Request, o: OrderFull) {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    type: o.type,
    steps: statusSteps(o.type),
    createdAt: o.createdAt.toISOString(),
    estimatedMinutes: o.estimatedMinutes,
    estimatedReadyAt: estimatedReadyAt(o)?.toISOString() ?? null,
    cancelReason: o.cancelReason,
    paymentMethod: o.paymentMethod,
    changeForCents: o.changeForCents,
    deliveryAddress: o.deliveryAddress,
    notes: o.notes,
    subtotalCents: o.subtotalCents,
    deliveryFeeCents: o.deliveryFeeCents,
    totalCents: o.totalCents,
    store: { ...o.store, logoUrl: absoluteUrl(req, o.store.logoUrl) },
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
      notes: i.notes,
      options: i.options.map((op) => ({ groupName: op.groupName, optionName: op.optionName, priceCents: op.priceCents })),
    })),
  };
}

export async function listOrders(req: Request, userId: string) {
  const orders = await prisma.order.findMany({
    where: { customerId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: ORDER_INCLUDE,
  });
  return orders.map((o) => orderJson(req, o));
}

export async function getOrder(req: Request, userId: string, id: string) {
  const order = await prisma.order.findFirst({ where: { id, customerId: userId }, include: ORDER_INCLUDE });
  return order ? orderJson(req, order) : null;
}
