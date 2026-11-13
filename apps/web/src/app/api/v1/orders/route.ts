import type { OrderType, PaymentMethod } from "@cardapio/db";
import { body, fail, ok, str, withUser } from "@/lib/server/api";
import { getOrder, listOrders } from "@/lib/server/api-data";
import { placeOrder } from "@/lib/server/place-order";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return withUser(req, async (user) => ok({ orders: await listOrders(req, user.id) }));
}

export function POST(req: Request) {
  return withUser(req, async (user) => {
    const data = await body(req);
    const items = Array.isArray(data.items) ? data.items : [];
    const result = await placeOrder(user.id, {
      storeSlug: str(data.storeSlug),
      type: str(data.type) as OrderType,
      paymentMethod: str(data.paymentMethod) as PaymentMethod,
      customerName: str(data.customerName, 100) || user.name || "",
      customerPhone: str(data.customerPhone, 30) || user.phone || "",
      deliveryAddress: str(data.deliveryAddress, 300),
      notes: str(data.notes, 500),
      changeFor: data.changeFor == null ? undefined : String(data.changeFor),
      items: items.map((i: Record<string, unknown>) => ({
        productId: str(i?.productId),
        quantity: Number(i?.quantity),
        notes: str(i?.notes),
        optionIds: Array.isArray(i?.optionIds) ? i.optionIds.map((id) => str(id)) : [],
      })),
    });
    if (!result.ok) return fail(result.error, 422);
    return ok({ order: await getOrder(req, user.id, result.orderId) }, 201);
  });
}
