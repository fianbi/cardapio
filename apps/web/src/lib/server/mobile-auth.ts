import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@cardapio/db";

// ─── Sessão do app (token "Bearer") ─────────────────────────────────────────

const TOKEN_DAYS = 180;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Cria uma sessão do app e devolve o token (só o hash fica no banco). */
export async function issueApiToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await prisma.apiToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TOKEN_DAYS * 86_400_000) },
  });
  return token;
}

export function bearerToken(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
}

/** Usuário dono do token enviado pelo app, ou null. */
export async function getApiUser(req: Request) {
  const token = bearerToken(req);
  if (!token) return null;
  const session = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  // Atualiza o "último uso" no máximo uma vez por hora.
  if (Date.now() - session.lastUsedAt.getTime() > 3_600_000) {
    await prisma.apiToken.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
  return session.user;
}

export async function revokeApiToken(req: Request) {
  const token = bearerToken(req);
  if (token) await prisma.apiToken.deleteMany({ where: { tokenHash: hashToken(token) } });
}

// ─── Login social: confere o token do Google/Apple recebido do app ──────────

export type SocialProfile = { provider: "google" | "apple"; sub: string; email: string | null; name: string | null; image: string | null };

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

const list = (value?: string) => (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);

/** IDs de cliente OAuth do Google aceitos (web + Android + iOS). */
export function googleAudiences() {
  return [...list(process.env.GOOGLE_MOBILE_CLIENT_IDS), ...list(process.env.AUTH_GOOGLE_ID)];
}

export async function verifyGoogleIdToken(idToken: string): Promise<SocialProfile | null> {
  const audience = googleAudiences();
  if (!idToken || audience.length === 0) return null; // sem IDs configurados, nenhum token é aceito
  try {
    const { payload } = await jwtVerify(idToken, googleKeys, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience,
    });
    if (!payload.sub) return null;
    return {
      provider: "google",
      sub: payload.sub,
      email: payload.email_verified ? String(payload.email ?? "").toLowerCase() || null : null,
      name: typeof payload.name === "string" ? payload.name : null,
      image: typeof payload.picture === "string" ? payload.picture : null,
    };
  } catch {
    return null;
  }
}

export async function verifyAppleIdToken(identityToken: string, fullName?: string | null): Promise<SocialProfile | null> {
  const audience = list(process.env.APPLE_BUNDLE_IDS);
  if (!identityToken || audience.length === 0) return null;
  try {
    const { payload } = await jwtVerify(identityToken, appleKeys, { issuer: "https://appleid.apple.com", audience });
    if (!payload.sub) return null;
    const verified = payload.email_verified === true || payload.email_verified === "true";
    return {
      provider: "apple",
      sub: payload.sub,
      email: verified ? String(payload.email ?? "").toLowerCase() || null : null,
      name: fullName?.trim().slice(0, 100) || null, // a Apple só envia o nome no primeiro login, pelo app
      image: null,
    };
  } catch {
    return null;
  }
}

/**
 * Acha ou cria o usuário de um login social, nas mesmas tabelas do Auth.js
 * (quem já entrou pelo site com o mesmo e-mail continua com a mesma conta).
 */
export async function findOrCreateSocialUser(profile: SocialProfile) {
  const account = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: profile.provider, providerAccountId: profile.sub } },
    include: { user: true },
  });
  if (account) return account.user;

  const link = { type: "oidc", provider: profile.provider, providerAccountId: profile.sub };
  const existing = profile.email ? await prisma.user.findUnique({ where: { email: profile.email } }) : null;
  if (existing) {
    await prisma.account.create({ data: { ...link, userId: existing.id } });
    return existing;
  }
  return prisma.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      image: profile.image,
      emailVerified: profile.email ? new Date() : null,
      accounts: { create: link },
    },
  });
}

/** Apaga a conta do cliente. Os pedidos ficam com a loja, sem ligação com a pessoa. */
export async function deleteAccount(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const stores = await prisma.store.count({ where: { ownerId: userId } });
  if (stores > 0) {
    return { ok: false, error: "Esta conta é dona de uma loja. Fale com o suporte para encerrar a loja antes de excluir a conta." };
  }
  await prisma.$transaction([
    prisma.order.updateMany({
      where: { customerId: userId },
      data: { customerId: null, customerName: "Cliente removido", customerPhone: null, deliveryAddress: null },
    }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  return { ok: true };
}
