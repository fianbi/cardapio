import { ok } from "@/lib/server/api";
import { listStores } from "@/lib/server/api-data";

export const dynamic = "force-dynamic";

/** Lista de lojas. Filtros: ?q=texto&tipo=pizza&aberto=1 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  return ok(
    await listStores(req, {
      q: params.get("q") ?? undefined,
      cuisine: params.get("tipo") ?? undefined,
      onlyOpen: params.get("aberto") === "1",
    }),
  );
}
