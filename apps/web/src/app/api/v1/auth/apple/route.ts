import { body, fail, ok, publicUser, str } from "@/lib/server/api";
import { findOrCreateSocialUser, issueApiToken, verifyAppleIdToken } from "@/lib/server/mobile-auth";

/** Login do app com Apple (iPhone). */
export async function POST(req: Request) {
  const { identityToken, fullName } = await body(req);
  const profile = await verifyAppleIdToken(str(identityToken, 5000), str(fullName, 100));
  if (!profile) return fail("Não foi possível confirmar sua conta Apple. Tente novamente.", 401);
  const user = await findOrCreateSocialUser(profile);
  return ok({ token: await issueApiToken(user.id), user: publicUser(user) });
}
