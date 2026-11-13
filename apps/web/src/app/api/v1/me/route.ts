import { prisma } from "@cardapio/db";
import { body, fail, ok, publicUser, str, withUser } from "@/lib/server/api";
import { deleteAccount } from "@/lib/server/mobile-auth";

export function GET(req: Request) {
  return withUser(req, async (user) => ok({ user: publicUser(user) }));
}

/** Atualiza nome e telefone. */
export function PATCH(req: Request) {
  return withUser(req, async (user) => {
    const data = await body(req);
    const update: { name?: string; phone?: string } = {};
    if (data.name !== undefined) {
      const name = str(data.name, 100);
      if (!name) return fail("Informe seu nome.");
      update.name = name;
    }
    if (data.phone !== undefined) {
      const phone = str(data.phone, 30).replace(/\D/g, "");
      if (phone.length < 10 || phone.length > 13) return fail("Informe um telefone com DDD.");
      update.phone = phone;
    }
    const saved = await prisma.user.update({ where: { id: user.id }, data: update });
    return ok({ user: publicUser(saved) });
  });
}

/** Exclui a conta do cliente (exigência das lojas de aplicativos). */
export function DELETE(req: Request) {
  return withUser(req, async (user) => {
    const result = await deleteAccount(user.id);
    return result.ok ? ok({ ok: true }) : fail(result.error, 409);
  });
}
