import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { centsToInput } from "@/lib/format";
import { PublishToggle, StoreForm } from "./store-form";

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
        }}
      />
    </div>
  );
}
