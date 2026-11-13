import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mesmo valor de test/env.ts (o arquivo de configuração não importa .ts).
const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? "postgresql://cardapio:cardapio@localhost:5433/cardapio_test?schema=public";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" só existe dentro do Next; nos testes vira um módulo vazio.
      "server-only": path.resolve(__dirname, "test/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    // Os testes de integração compartilham o mesmo banco: um arquivo por vez.
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      ALLOW_DEV_LOGIN: "1",
      PUSH_DISABLED: "1",
      GOOGLE_MOBILE_CLIENT_IDS: "",
      AUTH_GOOGLE_ID: "",
      APPLE_BUNDLE_IDS: "",
    },
  },
});
