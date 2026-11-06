import type { NextConfig } from "next";
import { config } from "dotenv";
import path from "node:path";

// As variáveis ficam num único .env na raiz do monorepo.
config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const nextConfig: NextConfig = {
  transpilePackages: ["@cardapio/db"],
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
