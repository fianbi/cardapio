import { fail, ok } from "@/lib/server/api";
import { getStoreMenu } from "@/lib/server/api-data";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreMenu(req, slug);
  return store ? ok({ store }) : fail("Loja não encontrada.", 404);
}
