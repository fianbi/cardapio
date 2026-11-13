import { prisma } from "@cardapio/db";
import { body, fail, ok, publicUser, str } from "@/lib/server/api";
import { issueApiToken } from "@/lib/server/mobile-auth";

/**
 * Login de desenvolvimento (sem Google/Apple), para testar o app no Expo Go e nos testes automatizados.
 * Só funciona fora de produção e com ALLOW_DEV_LOGIN=1.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEV_LOGIN !== "1") return fail("Não encontrado.", 404);
  const { email, name } = await body(req);
  const address = str(email).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+$/.test(address)) return fail("Informe um e-mail.");
  const user = await prisma.user.upsert({
    where: { email: address },
    update: {},
    create: { email: address, name: str(name, 100) || address.split("@")[0] },
  });
  return ok({ token: await issueApiToken(user.id), user: publicUser(user) });
}
