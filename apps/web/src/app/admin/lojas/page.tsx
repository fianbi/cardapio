import Link from "next/link";
import { prisma, type Prisma, type StoreApproval } from "@cardapio/db";
import { buttonClass, dangerButtonClass, secondaryButtonClass } from "@/components/ui";
import { TIMEZONE } from "@/lib/hours";
import { setStoreApproval } from "../actions";

export const dynamic = "force-dynamic";

const LABEL: Record<StoreApproval, string> = { PENDING: "Aguardando", APPROVED: "Aprovada", SUSPENDED: "Suspensa" };
const COLOR: Record<StoreApproval, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  SUSPENDED: "bg-red-100 text-red-800",
};

const date = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: TIMEZONE });

export default async function AdminStores({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q = "" } = await searchParams;
  const where: Prisma.StoreWhereInput = {};
  if (status === "PENDING" || status === "APPROVED" || status === "SUSPENDED") where.approvalStatus = status;
  if (q.trim()) where.OR = [{ name: { contains: q.trim(), mode: "insensitive" } }, { city: { contains: q.trim(), mode: "insensitive" } }];

  const stores = await prisma.store.findMany({
    where,
    orderBy: [{ approvalStatus: "asc" }, { createdAt: "desc" }],
    include: {
      owner: { select: { name: true, email: true } },
      _count: { select: { products: true, orders: true } },
      orders: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap gap-2 text-sm">
        <input name="q" defaultValue={q} placeholder="Buscar por nome ou cidade" className="min-w-56 flex-1 rounded-md border border-stone-300 bg-white px-3 py-2" />
        <select name="status" defaultValue={status ?? ""} className="rounded-md border border-stone-300 bg-white px-3 py-2">
          <option value="">Todas</option>
          <option value="PENDING">Aguardando aprovação</option>
          <option value="APPROVED">Aprovadas</option>
          <option value="SUSPENDED">Suspensas</option>
        </select>
        <button className={secondaryButtonClass}>Filtrar</button>
      </form>

      {stores.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhuma loja encontrada.</p>
      ) : (
        <ul className="space-y-3">
          {stores.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4">
              <div className="text-sm">
                <p className="text-base font-semibold">
                  {s.name}{" "}
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${COLOR[s.approvalStatus]}`}>
                    {LABEL[s.approvalStatus]}
                  </span>
                  {!s.isActive && <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs">rascunho do dono</span>}
                </p>
                <p className="text-stone-600">
                  {s.city}/{s.state} · dono: {s.owner.name ?? "sem nome"} ({s.owner.email})
                  {s.phone && ` · ${s.phone}`}
                </p>
                <p className="text-stone-500">
                  Criada em {date(s.createdAt)} · {s._count.products} produtos · {s._count.orders} pedidos
                  {s.orders[0] && ` · último pedido em ${date(s.orders[0].createdAt)}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/painel/${s.id}`} className={secondaryButtonClass}>
                  Abrir painel
                </Link>
                {s.approvalStatus !== "APPROVED" && (
                  <form action={setStoreApproval.bind(null, s.id, "APPROVED")}>
                    <button className={buttonClass}>{s.approvalStatus === "SUSPENDED" ? "Reativar" : "Aprovar"}</button>
                  </form>
                )}
                {s.approvalStatus !== "SUSPENDED" && (
                  <form action={setStoreApproval.bind(null, s.id, "SUSPENDED")}>
                    <button className={dangerButtonClass}>Suspender</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
