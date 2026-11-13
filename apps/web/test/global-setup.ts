import { execSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@cardapio/db";
import { TEST_DATABASE_URL } from "./env";

/**
 * Prepara o banco de testes (cardapio_test): cria se não existir e aplica as migrations.
 * Usa o mesmo Postgres do desenvolvimento (docker compose), em um banco separado.
 */
export default async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const database = url.pathname.slice(1);
  if (!/test/i.test(database)) throw new Error(`Os testes só rodam em um banco com "test" no nome (recebi "${database}").`);

  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
  try {
    const exists = await admin.$queryRawUnsafe<unknown[]>(`SELECT 1 FROM pg_database WHERE datname = '${database}'`);
    if (exists.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
  } finally {
    await admin.$disconnect();
  }

  execSync("pnpm exec prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../../../packages/db"),
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: "pipe",
  });
}
