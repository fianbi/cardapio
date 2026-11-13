import { prisma } from "@cardapio/db";
import { fail, ok, withUser } from "@/lib/server/api";

export function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withUser(req, async (user) => {
    const { id } = await params;
    const removed = await prisma.address.deleteMany({ where: { id, userId: user.id } });
    return removed.count ? ok({ ok: true }) : fail("Endereço não encontrado.", 404);
  });
}
