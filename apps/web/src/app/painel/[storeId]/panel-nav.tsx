"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PanelNav({ storeId }: { storeId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/painel/${storeId}`, label: "Pedidos" },
    { href: `/painel/${storeId}/comandas`, label: "Comandas" },
    { href: `/painel/${storeId}/cardapio`, label: "Cardápio" },
    { href: `/painel/${storeId}/loja`, label: "Loja e horários" },
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-stone-200 print:hidden">
      {tabs.map((t) => {
        const root = t.href === `/painel/${storeId}`;
        const active = root ? pathname === t.href : pathname.startsWith(t.href) || (t.label === "Comandas" && pathname.endsWith("/mesas"));
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${active ? "border-brand-600 text-brand-700" : "border-transparent text-stone-600 hover:text-stone-900"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
