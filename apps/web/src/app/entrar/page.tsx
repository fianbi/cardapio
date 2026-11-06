import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const session = await auth();
  if (session?.user) redirect(callbackUrl ?? "/");

  return (
    <div className="mx-auto mt-12 max-w-sm rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-xl font-bold">Entrar</h1>
      <p className="mt-1 text-sm text-stone-600">Use sua conta para fazer e acompanhar pedidos.</p>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: callbackUrl ?? "/" });
        }}
        className="mt-6"
      >
        <button className="w-full rounded-md border border-stone-300 px-4 py-2 font-medium hover:bg-stone-100">
          Continuar com Google
        </button>
      </form>
    </div>
  );
}
