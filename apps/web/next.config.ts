import type { NextConfig } from "next";

// As variáveis ficam num único .env na raiz do monorepo.
// Os scripts dev/build/start carregam esse arquivo com dotenv-cli (veja package.json).
const nextConfig: NextConfig = {
  transpilePackages: ["@cardapio/db", "@cardapio/shared"],
  serverExternalPackages: ["@prisma/client"],
  // Fotos de produto são enviadas por server action (limite padrão é 1 MB).
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

export default nextConfig;
