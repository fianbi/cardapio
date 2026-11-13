import { prisma } from "@cardapio/db";
import { body, fail, ok, str, withUser } from "@/lib/server/api";

/** Registra o aparelho para receber notificações do pedido. */
export function POST(req: Request) {
  return withUser(req, async (user) => {
    const data = await body(req);
    const token = str(data.token, 200);
    const platform = str(data.platform, 10);
    if (!/^Expo(nent)?PushToken\[.+\]$/.test(token)) return fail("Token de notificação inválido.");
    await prisma.pushToken.upsert({
      where: { token },
      update: { userId: user.id, platform },
      create: { token, platform: platform === "ios" ? "ios" : "android", userId: user.id },
    });
    return ok({ ok: true });
  });
}

/** Remove o aparelho (ao sair da conta). */
export function DELETE(req: Request) {
  return withUser(req, async (user) => {
    const data = await body(req);
    await prisma.pushToken.deleteMany({ where: { token: str(data.token, 200), userId: user.id } });
    return ok({ ok: true });
  });
}
