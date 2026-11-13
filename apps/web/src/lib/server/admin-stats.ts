import "server-only";
import { prisma } from "@cardapio/db";
import { TIMEZONE } from "../hours";

export type DayStat = { day: string; orders: number; canceled: number; totalCents: number };

/** "2026-11-12" no fuso das lojas. */
export function localDay(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d);
}

/** Agrupa pedidos por dia (fuso das lojas). O valor soma só pedidos não cancelados. */
export function groupByDay(orders: { createdAt: Date; status: string; totalCents: number }[], days: number, now = new Date()): DayStat[] {
  const stats = new Map<string, DayStat>();
  for (let i = 0; i < days; i++) {
    const day = localDay(new Date(now.getTime() - i * 86_400_000));
    stats.set(day, { day, orders: 0, canceled: 0, totalCents: 0 });
  }
  for (const o of orders) {
    const s = stats.get(localDay(o.createdAt));
    if (!s) continue;
    s.orders++;
    if (o.status === "CANCELED") s.canceled++;
    else s.totalCents += o.totalCents;
  }
  return [...stats.values()];
}

export async function getDashboard(days = 14) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [orders, stores, users, pendingStores] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true, totalCents: true, storeId: true },
    }),
    prisma.store.groupBy({ by: ["approvalStatus"], _count: true }),
    prisma.user.count(),
    prisma.store.count({ where: { approvalStatus: "PENDING" } }),
  ]);

  const byDay = groupByDay(orders, days);
  const byStore = new Map<string, { orders: number; totalCents: number }>();
  for (const o of orders) {
    const s = byStore.get(o.storeId) ?? { orders: 0, totalCents: 0 };
    s.orders++;
    if (o.status !== "CANCELED") s.totalCents += o.totalCents;
    byStore.set(o.storeId, s);
  }
  const names = await prisma.store.findMany({ where: { id: { in: [...byStore.keys()] } }, select: { id: true, name: true } });
  const topStores = names
    .map((n) => ({ ...n, ...byStore.get(n.id)! }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 10);

  return {
    byDay,
    topStores,
    users,
    pendingStores,
    storeCounts: Object.fromEntries(stores.map((s) => [s.approvalStatus, s._count])) as Record<string, number>,
    totals: {
      orders: orders.length,
      canceled: orders.filter((o) => o.status === "CANCELED").length,
      totalCents: orders.filter((o) => o.status !== "CANCELED").reduce((s, o) => s + o.totalCents, 0),
    },
  };
}
