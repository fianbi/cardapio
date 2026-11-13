"use server";

import { auth } from "@/auth";
import { placeOrder as place, type PlaceOrderInput, type PlaceOrderResult } from "@/lib/server/place-order";

export type { PlaceOrderInput, PlaceOrderResult };

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Entre com sua conta para finalizar o pedido." };
  return place(session.user.id, input);
}
