import Link from "next/link";
import { requireAdmin } from "@/lib/store-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const tabs = [
    { href: "/admin", label: "Visão geral" },
    { href: "/admin/lojas", label: "Lojas" },
    { href: "/admin/pedidos", label: "Pedidos" },
    { href: "/admin/usuarios", label: "Usuários" },
  ];
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-500">Administração da plataforma</p>
        <h1 className="text-2xl font-bold">Backoffice</h1>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-stone-200">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="whitespace-nowrap px-3 py-2 text-sm font-medium text-stone-700 hover:text-brand-700">
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
