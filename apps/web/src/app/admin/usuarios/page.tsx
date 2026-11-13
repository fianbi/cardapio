import { prisma, type Prisma, type UserRole } from "@cardapio/db";
import { TIMEZONE } from "@/lib/hours";
import { secondaryButtonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

const ROLE: Record<UserRole, string> = { CUSTOMER: "Cliente", STORE_OWNER: "Lojista", ADMIN: "Administrador" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const where: Prisma.UserWhereInput = q.trim()
    ? {
        OR: [
          { name: { contains: q.trim(), mode: "insensitive" } },
          { email: { contains: q.trim(), mode: "insensitive" } },
          { phone: { contains: q.replace(/\D/g, "") || q.trim() } },
        ],
      }
    : {};
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { orders: true, stores: true } } },
    }),
    prisma.user.count(),
  ]);

  return (
    <div className="space-y-4">
      <form className="flex gap-2 text-sm">
        <input name="q" defaultValue={q} placeholder="Nome, e-mail ou telefone" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2" />
        <button className={secondaryButtonClass}>Buscar</button>
      </form>
      <p className="text-xs text-stone-500">
        {total} usuários no total. Mostrando {users.length}.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full rounded-lg border border-stone-200 bg-white text-sm">
          <thead className="bg-stone-100 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="p-2">Nome</th>
              <th className="p-2">E-mail</th>
              <th className="p-2">Telefone</th>
              <th className="p-2">Perfil</th>
              <th className="p-2">Pedidos</th>
              <th className="p-2">Desde</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-2">{u.name ?? "—"}</td>
                <td className="p-2">{u.email ?? "—"}</td>
                <td className="p-2">{u.phone ?? "—"}</td>
                <td className="p-2">
                  {ROLE[u.role]}
                  {u._count.stores > 0 && ` (${u._count.stores} loja${u._count.stores > 1 ? "s" : ""})`}
                </td>
                <td className="p-2">{u._count.orders}</td>
                <td className="p-2">{u.createdAt.toLocaleDateString("pt-BR", { timeZone: TIMEZONE })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
