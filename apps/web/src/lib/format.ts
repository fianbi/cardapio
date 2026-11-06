const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatPrice(cents: number) {
  return brl.format(cents / 100);
}

/** Converte "22,50", "22.50" ou "R$ 1.234,90" em centavos. Retorna null se inválido. */
export function parsePriceToCents(value: FormDataEntryValue | null | undefined): number | null {
  const raw = String(value ?? "").replace(/[R$\s]/g, "");
  if (!raw) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** Centavos para o formato de input: 2250 -> "22,50". */
export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** "Lanchonete do Zé!" -> "lanchonete-do-ze" */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
