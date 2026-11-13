import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { centsToInput, formatPrice } from "@/lib/format";
import { buttonClass, dangerButtonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import { ProductForm } from "./product-form";
import { RecipeItemForm } from "../ingredientes/forms";
import { removeRecipeItem } from "../ingredientes/actions";
import { getMissingIngredients } from "@/lib/server/ingredients";
import {
  addCategory,
  deleteCategory,
  deleteProduct,
  moveCategory,
  moveProduct,
  renameCategory,
  toggleProductAvailability,
} from "./actions";
import { OptionGroups } from "./option-groups";

export const dynamic = "force-dynamic";

const iconButton = "rounded px-2 py-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30";

export default async function MenuPanel({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  await requireStoreOwner(storeId);

  const [categories, ingredients, missing] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { storeId },
      orderBy: { position: "asc" },
      include: {
        products: {
          orderBy: { position: "asc" },
          include: {
            recipe: { include: { ingredient: { select: { name: true, available: true } } } },
            optionGroups: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } },
          },
        },
      },
    }),
    prisma.ingredient.findMany({ where: { storeId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getMissingIngredients(storeId),
  ]);
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-8">
      {categories.length > 0 && (
        <section className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">Novo produto</h2>
          <ProductForm storeId={storeId} categories={categoryOptions} defaultCategoryId={categories[0].id} />
        </section>
      )}

      {categories.map((category, ci) => (
        <section key={category.id} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <form action={renameCategory.bind(null, storeId, category.id)} className="flex items-center gap-2">
              <input
                name="name"
                defaultValue={category.name}
                aria-label="Nome da categoria"
                className="rounded-md border border-transparent bg-transparent px-2 py-1 text-lg font-semibold hover:border-stone-300 focus:border-stone-300 focus:bg-white"
              />
              <button className="text-xs text-brand-700 hover:underline">Renomear</button>
            </form>
            <div className="ml-auto flex items-center gap-1">
              <form action={moveCategory.bind(null, storeId, category.id, -1)}>
                <button disabled={ci === 0} className={iconButton} aria-label={`Subir ${category.name}`}>
                  ↑
                </button>
              </form>
              <form action={moveCategory.bind(null, storeId, category.id, 1)}>
                <button disabled={ci === categories.length - 1} className={iconButton} aria-label={`Descer ${category.name}`}>
                  ↓
                </button>
              </form>
              {category.products.length === 0 && (
                <form action={deleteCategory.bind(null, storeId, category.id)}>
                  <button className="text-xs text-red-700 hover:underline">Excluir categoria</button>
                </form>
              )}
            </div>
          </div>

          {category.products.length === 0 ? (
            <p className="text-sm text-stone-500">Nenhum produto nesta categoria.</p>
          ) : (
            <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
              {category.products.map((p, pi) => (
                <li key={p.id} className="p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="h-14 w-14 rounded-md object-cover" />
                    )}
                    <div className={`min-w-40 flex-1 ${p.isAvailable ? "" : "opacity-60"}`}>
                      <p className="font-medium">
                        {p.name}
                        {!p.isAvailable && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Em falta</span>
                        )}
                        {p.isAvailable && missing.has(p.id) && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                            Em falta: sem {missing.get(p.id)!.join(", ")}
                          </span>
                        )}
                      </p>
                      {p.description && <p className="text-sm text-stone-600">{p.description}</p>}
                      <p className="text-sm font-semibold">{formatPrice(p.priceCents)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <form action={moveProduct.bind(null, storeId, p.id, -1)}>
                        <button disabled={pi === 0} className={iconButton} aria-label={`Subir ${p.name}`}>
                          ↑
                        </button>
                      </form>
                      <form action={moveProduct.bind(null, storeId, p.id, 1)}>
                        <button disabled={pi === category.products.length - 1} className={iconButton} aria-label={`Descer ${p.name}`}>
                          ↓
                        </button>
                      </form>
                      <form action={toggleProductAvailability.bind(null, storeId, p.id)}>
                        <button className={secondaryButtonClass}>{p.isAvailable ? "Marcar em falta" : "Voltou a ter"}</button>
                      </form>
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-brand-700">
                      Editar{p.optionGroups.length > 0 ? ` · adicionais (${p.optionGroups.length})` : ""}
                      {p.recipe.length > 0 ? ` · ingredientes (${p.recipe.length})` : ""}
                    </summary>
                    <div className="mt-3 space-y-3">
                      <OptionGroups storeId={storeId} productId={p.id} groups={p.optionGroups} />
                      <div className="space-y-2 rounded-md bg-stone-50 p-3">
                        <p className="text-sm font-medium">Ingredientes</p>
                        {p.recipe.length > 0 && (
                          <ul className="text-sm">
                            {p.recipe.map((r) => (
                              <li key={r.id} className="flex items-center gap-3">
                                <span className={r.ingredient.available ? "" : "text-red-700"}>
                                  {r.ingredient.name}
                                  {!r.ingredient.available && " (em falta)"}
                                </span>
                                <form action={removeRecipeItem.bind(null, storeId, r.id)}>
                                  <button className="text-xs text-red-700 hover:underline" aria-label={`Remover ${r.ingredient.name} do produto`}>
                                    remover
                                  </button>
                                </form>
                              </li>
                            ))}
                          </ul>
                        )}
                        <RecipeItemForm storeId={storeId} productId={p.id} ingredients={ingredients} />
                      </div>
                      <ProductForm
                        storeId={storeId}
                        categories={categoryOptions}
                        defaultCategoryId={category.id}
                        product={{
                          id: p.id,
                          name: p.name,
                          description: p.description,
                          imageUrl: p.imageUrl,
                          price: centsToInput(p.priceCents),
                        }}
                      />
                      <form action={deleteProduct.bind(null, storeId, p.id)}>
                        <button className={dangerButtonClass}>Excluir produto</button>
                      </form>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="rounded-lg border border-dashed border-stone-300 p-4">
        <form action={addCategory.bind(null, storeId)} className="flex gap-2">
          <input name="name" required placeholder="Nova categoria (ex.: Porções)" className={inputClass} />
          <button className={buttonClass}>Adicionar</button>
        </form>
      </section>
    </div>
  );
}
