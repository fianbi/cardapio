import { prisma } from "@cardapio/db";
import { body, fail, ok, str, withUser } from "@/lib/server/api";
import { formatAddress } from "@/lib/address";

export const dynamic = "force-dynamic";

const MAX_ADDRESSES = 10;

export function GET(req: Request) {
  return withUser(req, async (user) => {
    const addresses = await prisma.address.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
    return ok({ addresses: addresses.map((a) => ({ ...a, formatted: formatAddress(a) })) });
  });
}

export function POST(req: Request) {
  return withUser(req, async (user) => {
    const data = await body(req);
    const street = str(data.street);
    const number = str(data.number, 20);
    const district = str(data.district, 100);
    if (!street || !number || !district) return fail("Informe rua, número e bairro.");
    if ((await prisma.address.count({ where: { userId: user.id } })) >= MAX_ADDRESSES) {
      return fail("Você atingiu o limite de endereços salvos. Apague um para adicionar outro.");
    }
    const address = await prisma.address.create({
      data: {
        userId: user.id,
        label: str(data.label, 40) || null,
        street,
        number,
        district,
        complement: str(data.complement, 100) || null,
        reference: str(data.reference, 150) || null,
        city: str(data.city, 100) || null,
      },
    });
    return ok({ address: { ...address, formatted: formatAddress(address) } }, 201);
  });
}
