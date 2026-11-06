import { notFound, redirect } from "next/navigation";
import { prisma } from "@cardapio/db";
import { auth } from "@/auth";

/** Garante que o usuário logado é dono da loja (ou admin). Usado em páginas e server actions do painel. */
export async function requireStoreOwner(storeId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/entrar?callbackUrl=${encodeURIComponent(`/painel/${storeId}`)}`);

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) notFound();
  if (store.ownerId !== session.user.id && session.user.role !== "ADMIN") notFound();

  return { session, store };
}

export async function requireUser(callbackUrl = "/painel") {
  const session = await auth();
  if (!session?.user?.id) redirect(`/entrar?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return session;
}
