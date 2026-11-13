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

/** E-mails que viram administradores da plataforma (variável ADMIN_EMAILS, separados por vírgula). */
function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Garante que o usuário logado é administrador da plataforma. Quem não é recebe 404. */
export async function requireAdmin(callbackUrl = "/admin") {
  const session = await auth();
  if (!session?.user?.id) redirect(`/entrar?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (session.user.role !== "ADMIN") {
    // Primeiro acesso de um e-mail listado em ADMIN_EMAILS: promove a administrador.
    const email = session.user.email?.toLowerCase();
    if (!email || !adminEmails().includes(email)) notFound();
    await prisma.user.update({ where: { id: session.user.id }, data: { role: "ADMIN" } });
  }
  return session;
}
