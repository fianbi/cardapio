import { fail, ok, withUser } from "@/lib/server/api";
import { getOrder } from "@/lib/server/api-data";

export const dynamic = "force-dynamic";

export function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withUser(req, async (user) => {
    const { id } = await params;
    const order = await getOrder(req, user.id, id);
    return order ? ok({ order }) : fail("Pedido não encontrado.", 404);
  });
}
