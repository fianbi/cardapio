import type { Metadata } from "next";
import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cardápio — lanchonetes e restaurantes da cidade",
  description: "Todos os cardápios da cidade em um só lugar. Escolha, peça e acompanhe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
