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
        <footer className="mx-auto max-w-5xl px-4 pb-8 pt-4 text-center text-xs text-stone-500 print:hidden">
          <a href="/termos" className="hover:underline">
            Termos de uso
          </a>
          {" · "}
          <a href="/privacidade" className="hover:underline">
            Política de privacidade
          </a>
        </footer>
      </body>
    </html>
  );
}
