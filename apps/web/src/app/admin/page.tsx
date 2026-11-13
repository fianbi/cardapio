import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { getDashboard } from "@/lib/server/admin-stats";

export const dynamic = "force-dynamic";

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export default async function AdminHome() {
  const d = await getDashboard(14);
  const today = d.byDay[0];
  const cancelRate = d.totals.orders ? Math.round((d.totals.canceled / d.totals.orders) * 100) : 0;
  const max = Math.max(1, ...d.byDay.map((x) => x.orders));

  return (
    <div className="space-y-8">
      {d.pendingStores > 0 && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {d.pendingStores === 1 ? "Há 1 loja aguardando" : `Há ${d.pendingStores} lojas aguardando`} aprovação.{" "}
          <Link href="/admin/lojas?status=PENDING" className="font-medium underline">
            Revisar
          </Link>
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Pedidos hoje" value={String(today.orders)} hint={formatPrice(today.totalCents)} />
        <Card label="Pedidos em 14 dias" value={String(d.totals.orders)} hint={`${formatPrice(d.totals.totalCents)} vendidos`} />
        <Card label="Cancelamentos em 14 dias" value={`${cancelRate}%`} hint={`${d.totals.canceled} pedidos`} />
        <Card
          label="Lojas aprovadas"
          value={String(d.storeCounts.APPROVED ?? 0)}
          hint={`${d.storeCounts.PENDING ?? 0} aguardando · ${d.storeCounts.SUSPENDED ?? 0} suspensas · ${d.users} usuários`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pedidos por dia</h2>
        <table className="w-full overflow-hidden rounded-lg border border-stone-200 bg-white text-sm">
          <thead className="bg-stone-100 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="p-2">Dia</th>
              <th className="p-2">Pedidos</th>
              <th className="p-2 text-right">Cancelados</th>
              <th className="p-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {d.byDay.map((x) => (
              <tr key={x.day}>
                <td className="p-2">{x.day.split("-").reverse().join("/")}</td>
                <td className="p-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2 rounded bg-brand-500" style={{ width: `${(x.orders / max) * 120}px` }} />
                    {x.orders}
                  </span>
                </td>
                <td className="p-2 text-right">{x.canceled}</td>
                <td className="p-2 text-right">{formatPrice(x.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Lojas com mais pedidos (14 dias)</h2>
        {d.topStores.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum pedido no período.</p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white text-sm">
            {d.topStores.map((s) => (
              <li key={s.id} className="flex justify-between p-3">
                <Link href={`/painel/${s.id}`} className="font-medium text-brand-700 hover:underline">
                  {s.name}
                </Link>
                <span>
                  {s.orders} pedidos · {formatPrice(s.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
