import "server-only";
import { prisma } from "@cardapio/db";

/**
 * Ingredientes em falta de cada produto da loja (só os produtos afetados aparecem no Map).
 * Produto com algum ingrediente em falta fica indisponível para pedido.
 */
export async function getMissingIngredients(storeId: string) {
  const recipes = await prisma.recipeItem.findMany({
    where: { product: { storeId }, ingredient: { available: false } },
    select: { productId: true, ingredient: { select: { name: true } } },
  });
  const missing = new Map<string, string[]>();
  for (const r of recipes) missing.set(r.productId, [...(missing.get(r.productId) ?? []), r.ingredient.name]);
  return missing;
}
