import type { NextConfig } from "next";

// As variáveis ficam num único .env na raiz do monorepo.
// Os scripts dev/build/start carregam esse arquivo com dotenv-cli (veja package.json).
const nextConfig: NextConfig = {
  transpilePackages: ["@cardapio/db"],
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
