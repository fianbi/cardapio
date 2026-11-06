import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { secondaryButtonClass } from "@/components/ui";
import { EditIngredientForm, NewIngredientForm } from "./forms";
import { deleteIngredient, toggleIngredient } from "./actions";

export const dynamic = "force-dynamic";

export default async function IngredientsPanel({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  await requireStoreOwner(storeId);

  const ingredients = await prisma.ingredient.findMany({
    where: { storeId },
    orderBy: { name: "asc" },
    include: { recipes: { include: { product: { select: { name: true } } } } },
  });

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Novo ingrediente</h2>
        <p className="text-sm text-stone-500">
          Ligue os ingredientes a cada produto na aba Cardápio (em Editar). Quando um ingrediente acabar, marque ele como
          em falta aqui: todos os produtos que usam ele aparecem como &quot;em falta&quot; para o cliente na hora.
        </p>
        <NewIngredientForm storeId={storeId} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ingredientes</h2>
        {ingredients.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum ingrediente cadastrado.</p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {ingredients.map((i) => (
              <li key={i.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className={i.available ? "" : "opacity-70"}>
                    <p className="font-medium">
                      {i.name}
                      {!i.available && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Em falta</span>
                      )}
                    </p>
                    <p className="text-xs text-stone-500">
                      {i.recipes.length > 0
                        ? `Usado em: ${i.recipes.map((r) => r.product.name).join(", ")}`
                        : "Ainda não usado em nenhum produto"}
                    </p>
                  </div>
                  <form action={toggleIngredient.bind(null, storeId, i.id)}>
                    <button className={secondaryButtonClass}>{i.available ? "Marcar em falta" : "Voltou a ter"}</button>
                  </form>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm text-brand-700">Editar</summary>
                  <div className="mt-3 space-y-2">
                    <EditIngredientForm storeId={storeId} ingredient={{ id: i.id, name: i.name }} />
                    <form action={deleteIngredient.bind(null, storeId, i.id)}>
                      <button className="text-sm text-red-700 hover:underline">Excluir ingrediente</button>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
