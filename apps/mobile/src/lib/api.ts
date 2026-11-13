import type { OptionGroupLike, OrderStatus, OrderType, PaymentMethod } from "@cardapio/shared";
import { API_URL } from "./config";

// ─── Tipos devolvidos pela API (/api/v1) ────────────────────────────────────

export type User = { id: string; name: string | null; email: string | null; phone: string | null; image: string | null };

export type StoreSummary = {
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  cuisines: string[];
  city: string;
  district: string | null;
  isOpen: boolean;
  isPaused: boolean;
  todayLabel: string;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  acceptsDineIn: boolean;
  deliveryFeeCents: number;
  minOrderCents: number;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  isAvailable: boolean;
  optionGroups: OptionGroupLike[];
};

export type StoreMenu = StoreSummary & {
  phone: string | null;
  address: string;
  hours: { weekday: number; opensAt: string; closesAt: string }[];
  categories: { id: string; name: string; products: Product[] }[];
};

export type Order = {
  id: string;
  number: number;
  status: OrderStatus;
  type: OrderType;
  steps: OrderStatus[];
  createdAt: string;
  estimatedMinutes: number | null;
  estimatedReadyAt: string | null;
  cancelReason: string | null;
  paymentMethod: PaymentMethod | null;
  changeForCents: number | null;
  deliveryAddress: string | null;
  notes: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  store: { name: string; slug: string; phone: string | null; logoUrl: string | null };
  items: {
    id: string;
    productId: string | null;
    productName: string;
    unitPriceCents: number;
    quantity: number;
    notes: string | null;
    options: { groupName: string; optionName: string; priceCents: number }[];
  }[];
};

export type Address = {
  id: string;
  label: string | null;
  street: string;
  number: string;
  district: string;
  complement: string | null;
  reference: string | null;
  city: string | null;
  formatted: string;
};

export type NewOrder = {
  storeSlug: string;
  type: OrderType;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  notes?: string;
  changeFor?: string;
  items: { productId: string; quantity: number; optionIds: string[]; notes?: string }[];
};

// ─── Cliente HTTP ───────────────────────────────────────────────────────────

/** Erro com a mensagem (em português) que pode ser mostrada ao cliente. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Chamado quando o servidor recusa o token (sessão vencida): o app volta para "deslogado". */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export async function api<T>(path: string, options: { method?: string; body?: unknown; fetchImpl?: typeof fetch } = {}): Promise<T> {
  const doFetch = options.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(`${API_URL}/api/v1${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Sem conexão. Confira sua internet e tente de novo.", 0);
  }

  const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) {
    if (res.status === 401 && authToken) onUnauthorized?.();
    throw new ApiError(json?.error ?? "Algo deu errado. Tente novamente.", res.status);
  }
  return json as T;
}

export function errorMessage(e: unknown) {
  return e instanceof ApiError ? e.message : "Algo deu errado. Tente novamente.";
}
