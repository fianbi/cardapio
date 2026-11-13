import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { centsToInput } from "@/lib/format";
import { buttonClass, inputClass } from "@/components/ui";
import { PublishToggle, StoreForm } from "./store-form";
import { saveLogo } from "./actions";

export const dynamic = "force-dynamic";

export default async function StoreSettings({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ nova?: string }>;
}) {
  const [{ storeId }, { nova }] = await Promise.all([params, searchParams]);
  const { store } = await requireStoreOwner(storeId);
  const hours = await prisma.openingHour.findMany({ where: { storeId }, orderBy: { weekday: "asc" } });

  return (
    <div className="space-y-6">
      {nova && (
        <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          Loja criada! Complete os dados abaixo, monte o cardápio e depois publique.
        </p>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4">
        <div>
          <h2 className="font-semibold">{store.isActive ? "Loja publicada" : "Loja em rascunho"}</h2>
          <p className="text-sm text-stone-500">
            {store.isActive
              ? "Os clientes já encontram sua loja e podem fazer pedidos no horário de funcionamento."
              : "Publique quando o cardápio e os horários estiverem prontos."}
          </p>
        </div>
        <PublishToggle storeId={store.id} isActive={store.isActive} />
      </section>

      {store.approvalStatus === "PENDING" && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          A plataforma ainda vai aprovar sua loja. Você pode publicar agora: ela aparece para os clientes assim que a
          aprovação sair.
        </p>
      )}

      <section className="flex flex-wrap items-center gap-4 rounded-lg border border-stone-200 bg-white p-4">
        {store.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logoUrl} alt="Logo da loja" className="h-16 w-16 rounded-md object-cover" />
        )}
        <form action={saveLogo.bind(null, store.id)} className="flex flex-1 flex-wrap items-end gap-3 text-sm">
          <label className="block min-w-56 flex-1">
            Logo da loja (JPG/PNG/WebP até 4 MB)
            <input name="logo" type="file" accept="image/jpeg,image/png,image/webp" className={`${inputClass} mt-1`} />
          </label>
          {store.logoUrl && (
            <label className="flex items-center gap-2 text-stone-600">
              <input type="checkbox" name="remove" /> Remover
            </label>
          )}
          <button className={buttonClass}>Salvar logo</button>
        </form>
      </section>

      <StoreForm
        storeId={store.id}
        isActive={store.isActive}
        hours={hours.map((h) => ({ weekday: h.weekday, opensAt: h.opensAt, closesAt: h.closesAt }))}
        values={{
          name: store.name,
          description: store.description ?? "",
          phone: store.phone ?? "",
          whatsapp: store.whatsapp ?? "",
          cuisines: store.cuisines.join(", "),
          street: store.street ?? "",
          number: store.number ?? "",
          district: store.district ?? "",
          zipCode: store.zipCode ?? "",
          city: store.city,
          state: store.state,
          acceptsDelivery: store.acceptsDelivery,
          acceptsPickup: store.acceptsPickup,
          acceptsDineIn: store.acceptsDineIn,
          deliveryFee: centsToInput(store.deliveryFeeCents),
          minOrder: centsToInput(store.minOrderCents),
          serviceFeePercent: String(store.serviceFeePercent),
        }}
      />
    </div>
  );
}
