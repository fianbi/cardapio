import type { IngredientUnit } from "@cardapio/db";

export const UNIT_SHORT: Record<IngredientUnit, string> = { UNIT: "un", GRAM: "g", MILLILITER: "ml" };
export const UNIT_LABEL: Record<IngredientUnit, string> = {
  UNIT: "Unidade (un)",
  GRAM: "Gramas (g)",
  MILLILITER: "Mililitros (ml)",
};

const nf = new Intl.NumberFormat("pt-BR");

/** 1500 g -> "1.500 g (1,5 kg)" */
export function formatQty(qty: number, unit: IngredientUnit) {
  const base = `${nf.format(qty)} ${UNIT_SHORT[unit]}`;
  if (unit === "GRAM" && Math.abs(qty) >= 1000) return `${base} (${nf.format(qty / 1000)} kg)`;
  if (unit === "MILLILITER" && Math.abs(qty) >= 1000) return `${base} (${nf.format(qty / 1000)} l)`;
  return base;
}
