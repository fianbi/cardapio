"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@cardapio/db";
import { requireStoreOwner } from "@/lib/store-auth";
import { parsePriceToCents } from "@/lib/format";

export type FormState = { error?: string; ok?: boolean; at?: number } | undefined;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const text = (form: FormData, key: string, max = 200) => String(form.get(key) ?? "").trim().slice(0, max) || null;

export async function saveStore(storeId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { store } = await requireStoreOwner(storeId);

  const name = text(form, "name", 100);
  const city = text(form, "city", 100);
  const state = String(form.get("state") ?? "").trim().toUpperCase();
  if (!name) return { error: "Informe o nome da loja." };
  if (!city) return { error: "Informe a cidade." };
  if (!/^[A-Z]{2}$/.test(state)) return { error: "UF deve ter 2 letras." };

  const deliveryFeeCents = parsePriceToCents(form.get("deliveryFee")) ?? 0;
  const minOrderCents = parsePriceToCents(form.get("minOrder")) ?? 0;
  const acceptsDelivery = form.get("acceptsDelivery") === "on";
  const acceptsPickup = form.get("acceptsPickup") === "on";
  const acceptsDineIn = form.get("acceptsDineIn") === "on";
  if (!acceptsDelivery && !acceptsPickup && !acceptsDineIn) {
    return { error: "Escolha pelo menos uma forma de atendimento." };
  }

  const cuisines = String(form.get("cuisines") ?? "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

  // Horários: um turno por dia da semana.
  const hours: { weekday: number; opensAt: string; closesAt: string }[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    if (form.get(`open-${weekday}`) !== "on") continue;
    const opensAt = String(form.get(`opensAt-${weekday}`) ?? "");
    const closesAt = String(form.get(`closesAt-${weekday}`) ?? "");
    if (!TIME.test(opensAt) || !TIME.test(closesAt) || opensAt === closesAt) {
      return { error: "Confira os horários: use HH:MM e abertura diferente do fechamento." };
    }
    hours.push({ weekday, opensAt, closesAt });
  }

  await prisma.$transaction([
    prisma.store.update({
      where: { id: storeId },
      data: {
        name,
        description: text(form, "description", 300),
        phone: text(form, "phone", 20),
        whatsapp: text(form, "whatsapp", 20)?.replace(/\D/g, "") || null,
        cuisines,
        street: text(form, "street"),
        number: text(form, "number", 20),
        district: text(form, "district", 100),
        zipCode: text(form, "zipCode", 10),
        city,
        state,
        acceptsDelivery,
        acceptsPickup,
        acceptsDineIn,
        deliveryFeeCents,
        minOrderCents,
      },
    }),
    prisma.openingHour.deleteMany({ where: { storeId } }),
    prisma.openingHour.createMany({ data: hours.map((h) => ({ ...h, storeId })) }),
  ]);

  revalidatePath(`/painel/${storeId}`, "layout");
  revalidatePath(`/lojas/${store.slug}`);
  return { ok: true, at: Date.now() };
}

export async function setPublished(storeId: string, publish: boolean): Promise<FormState> {
  const { store } = await requireStoreOwner(storeId);

  if (publish) {
    const [products, hours] = await Promise.all([
      prisma.product.count({ where: { storeId, isAvailable: true } }),
      prisma.openingHour.count({ where: { storeId } }),
    ]);
    if (products === 0) return { error: "Cadastre pelo menos um produto no cardápio antes de publicar." };
    if (hours === 0) return { error: "Defina os horários de funcionamento antes de publicar." };
  }

  await prisma.store.update({ where: { id: storeId }, data: { isActive: publish } });
  revalidatePath(`/painel/${storeId}`, "layout");
  revalidatePath("/");
  revalidatePath(`/lojas/${store.slug}`);
  return { ok: true, at: Date.now() };
}
