import { body, fail, ok, publicUser, str } from "@/lib/server/api";
import { findOrCreateSocialUser, issueApiToken, verifyGoogleIdToken } from "@/lib/server/mobile-auth";

/** Login do app com Google: recebe o idToken do aparelho e devolve o token de sessão do app. */
export async function POST(req: Request) {
  const { idToken } = await body(req);
  const profile = await verifyGoogleIdToken(str(idToken, 5000));
  if (!profile) return fail("Não foi possível confirmar sua conta Google. Tente novamente.", 401);
  const user = await findOrCreateSocialUser(profile);
  return ok({ token: await issueApiToken(user.id), user: publicUser(user) });
}
