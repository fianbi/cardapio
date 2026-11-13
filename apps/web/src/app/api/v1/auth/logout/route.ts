import { ok } from "@/lib/server/api";
import { revokeApiToken } from "@/lib/server/mobile-auth";

export async function POST(req: Request) {
  await revokeApiToken(req);
  return ok({ ok: true });
}
