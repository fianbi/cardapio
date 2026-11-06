import { requireUser } from "@/lib/store-auth";
import { NewStoreForm } from "./new-store-form";

export default async function NewStorePage() {
  await requireUser("/painel/nova");
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cadastrar minha loja</h1>
        <p className="text-stone-600">
          Comece com o básico. Depois você completa endereço, horários e cardápio antes de publicar.
        </p>
      </div>
      <NewStoreForm />
    </div>
  );
}
