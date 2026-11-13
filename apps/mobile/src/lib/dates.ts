// Datas mostradas no horário do aparelho. Feito à mão: o Intl do React Native nem sempre traz pt-BR.
const pad = (n: number) => String(n).padStart(2, "0");

/** "21:35" */
export function formatTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "12/11/2026 21:35" */
export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${formatTime(iso)}`;
}
