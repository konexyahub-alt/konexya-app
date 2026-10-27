import { Suspense } from "react";
import { EmptyState, PropertyCardSkeleton, Wordmark } from "@/components/ui";
import { requireReadyClient } from "@/lib/auth";
import { signOut } from "./actions";

/** Início do app do cliente. A Conversa (C-04) chega na etapa 2. */
export default function ClientHome() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-[22px] pb-7 pt-6">
      <Wordmark className="h-6" />
      <Suspense fallback={<PropertyCardSkeleton />}>
        <Home />
      </Suspense>
    </main>
  );
}

async function Home() {
  const { name } = await requireReadyClient("/app");
  return (
    <>
      <h1 className="text-[26px] font-bold tracking-tight">Olá, {name}!</h1>
      <EmptyState
        title="A conversa com a IA chega em breve."
        description="Seu acesso está pronto. Avisaremos quando a Konexya puder começar a procurar imóveis com você."
      />
      <form action={signOut} className="mt-auto">
        <button type="submit" className="min-h-touch text-sm font-semibold text-muted underline underline-offset-4">
          Sair
        </button>
      </form>
    </>
  );
}
