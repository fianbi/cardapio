import "server-only";
import type { Prisma } from "@cardapio/db";

/** Loja visível para os clientes: publicada pelo dono e aprovada pela administração. */
export const PUBLIC_STORE: Prisma.StoreWhereInput = { isActive: true, approvalStatus: "APPROVED" };

export function isPublicStore(store: { isActive: boolean; approvalStatus: string }) {
  return store.isActive && store.approvalStatus === "APPROVED";
}
