import "server-only";
import { NextResponse } from "next/server";
import type { User } from "@cardapio/db";
import { getApiUser } from "./mobile-auth";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** Corpo JSON da requisição como objeto (vazio se inválido). */
export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const json = await req.json();
    return json && typeof json === "object" && !Array.isArray(json) ? (json as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const str = (value: unknown, max = 200) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** Executa `handler` com o usuário do token; sem token válido responde 401. */
export async function withUser(req: Request, handler: (user: User) => Promise<NextResponse>) {
  const user = await getApiUser(req);
  if (!user) return fail("Entre com sua conta para continuar.", 401);
  return handler(user);
}

export function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, image: user.image };
}

/** Transforma "/uploads/x.jpg" em URL completa (o app precisa do endereço inteiro). */
export function absoluteUrl(req: Request, url: string | null) {
  if (!url || /^https?:\/\//i.test(url)) return url;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return url;
  const proto = req.headers.get("x-forwarded-proto") ?? (/^(localhost|127\.|10\.|192\.168\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}${url}`;
}
