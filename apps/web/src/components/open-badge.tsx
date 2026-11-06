export function OpenBadge({ open }: { open: boolean }) {
  return open ? (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Aberto</span>
  ) : (
    <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">Fechado</span>
  );
}
