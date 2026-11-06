import "server-only";
import { headers } from "next/headers";

/** URL pública do site (para links em QR codes). */
export async function siteUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.AUTH_URL ?? "http://localhost:3000";
}
