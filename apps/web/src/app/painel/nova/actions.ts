"use server";

import { redirect } from "next/navigation";
import { prisma } from "@cardapio/db";
import { requireUser } from "@/lib/store-auth";
import { slugify } from "@/lib/format";

export type FormState = { error?: string; ok?: boolean } | undefined;

export async function createStore(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await requireUser("/painel/nova");
  const name = String(form.get("name") ?? "").trim();
  const city = String(form.get("city") ?? "").trim();
  const state = String(form.get("state") ?? "").trim().toUpperCase();

  if (name.length < 2) return { error: "Informe o nome da loja." };
  if (!city) return { error: "Informe a cidade." };
  if (!/^[A-Z]{2}$/.test(state)) return { error: "Informe a UF com 2 letras (ex.: SP)." };

  const base = slugify(name) || "loja";
  let slug = base;
  for (let i = 2; await prisma.store.findUnique({ where: { slug }, select: { id: true } }); i++) {
    slug = `${base}-${i}`;
  }

  const store = await prisma.store.create({
    data: {
      name,
      slug,
      city,
      state,
      isActive: false, // começa como rascunho até o dono publicar
      ownerId: session.user.id,
      categories: { create: [{ name: "Lanches", position: 0 }, { name: "Bebidas", position: 1 }] },
    },
  });

  if (session.user.role === "CUSTOMER") {
    await prisma.user.update({ where: { id: session.user.id }, data: { role: "STORE_OWNER" } });
  }

  redirect(`/painel/${store.id}/loja?nova=1`);
}
