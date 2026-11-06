import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { formatQty } from "@/lib/units";
import { TIMEZONE } from "@/lib/hours";
import { EditIngredientForm, MoveStockForm, NewIngredientForm } from "./forms";
import { deleteIngredient } from "./actions";

export const dynamic = "force-dynamic";

const REASON_LABEL = {
  PURCHASE: "Entrada",
  SALE: "Venda",
  RETURN: "Devolução (cancelado)",
  ADJUSTMENT: "Contagem",
  LOSS: "Perda",
} as const;

export default async function StockPanel({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  await requireStoreOwner(storeId);

  const [ingredients, moves] = await Promise.all([
    prisma.ingredient.findMany({
      where: { storeId },
      orderBy: { name: "asc" },
      include: { recipes: { include: { product: { select: { name: true } } } } },
    }),
    prisma.stockMovement.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { ingredient: { select: { name: true, unit: true } }, order: { select: { number: true } } },
    }),
  ]);
  const low = ingredients.filter((i) => i.stockQty <= i.minQty);

  return (
    <div className="space-y-8">
      {low.length > 0 && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Estoque baixo:</strong> {low.map((i) => `${i.name} (${formatQty(i.stockQty, i.unit)})`).join(", ")}
        </p>
      )}

      <section className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Novo ingrediente</h2>
        <p className="text-sm text-stone-500">
          Use números inteiros na unidade escolhida: 1 kg = 1000 g, 1 litro = 1000 ml. Depois monte a ficha técnica de cada
          produto na aba Cardápio. Os pedidos dão baixa automática e, quando um ingrediente acaba, o produto aparece como
          &quot;em falta&quot;.
        </p>
        <NewIngredientForm storeId={storeId} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ingredientes</h2>
        {ingredients.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum ingrediente cadastrado.</p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {ingredients.map((i) => {
              const isLow = i.stockQty <= i.minQty;
              return (
                <li key={i.id} className="space-y-3 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="font-medium">{i.name}</p>
                      <p className="text-xs text-stone-500">
                        {i.recipes.length > 0
                          ? `Usado em: ${i.recipes.map((r) => r.product.name).join(", ")}`
                          : "Ainda não usado em nenhum produto"}
                      </p>
                    </div>
                    <p className={`text-lg font-semibold ${i.stockQty <= 0 ? "text-red-700" : isLow ? "text-amber-700" : ""}`}>
                      {formatQty(i.stockQty, i.unit)}
                      {i.stockQty <= 0 ? " · acabou" : isLow ? " · baixo" : ""}
                    </p>
                  </div>
                  <MoveStockForm storeId={storeId} ingredientId={i.id} unit={i.unit} />
                  <details>
                    <summary className="cursor-pointer text-sm text-brand-700">Editar</summary>
                    <div className="mt-3 space-y-2">
                      <EditIngredientForm
                        storeId={storeId}
                        ingredient={{ id: i.id, name: i.name, unit: i.unit, minQty: i.minQty }}
                      />
                      <form action={deleteIngredient.bind(null, storeId, i.id)}>
                        <button className="text-sm text-red-700 hover:underline">Excluir ingrediente</button>
                      </form>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Últimas movimentações</h2>
        {moves.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhuma ainda.</p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white text-sm">
            {moves.map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-2 p-3">
                <span>
                  {m.createdAt.toLocaleString("pt-BR", { timeZone: TIMEZONE, dateStyle: "short", timeStyle: "short" })} ·{" "}
                  {m.ingredient.name} · {REASON_LABEL[m.reason]}
                  {m.order && ` (pedido #${m.order.number})`}
                  {m.note && <span className="text-stone-500"> · {m.note}</span>}
                </span>
                <span className={m.delta < 0 ? "text-red-700" : "text-green-700"}>
                  {m.delta > 0 ? "+" : ""}
                  {formatQty(m.delta, m.ingredient.unit)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
