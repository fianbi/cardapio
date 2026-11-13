import { defineConfig } from "vitest/config";

// Testes das regras do app que não dependem do React Native (carrinho, formatação, cliente da API).
export default defineConfig({
  test: { environment: "node", include: ["test/**/*.test.ts"] },
});
