import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-brand-600">
          Cardápio
        </Link>
        {session?.user ? (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
            className="flex items-center gap-3 text-sm"
          >
            {session.user.role === "ADMIN" && (
              <Link href="/admin" className="font-medium text-brand-700 hover:underline">
                Admin
              </Link>
            )}
            {session.user.role !== "CUSTOMER" && (
              <Link href="/painel" className="font-medium text-brand-700 hover:underline">
                Minha loja
              </Link>
            )}
            <Link href="/pedidos" className="font-medium text-brand-700 hover:underline">
              Meus pedidos
            </Link>
            <span className="hidden sm:inline">Olá, {session.user.name?.split(" ")[0]}</span>
            <button className="rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-100">
              Sair
            </button>
          </form>
        ) : (
          <Link
            href="/entrar"
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
