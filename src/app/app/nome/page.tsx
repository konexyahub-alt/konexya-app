import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui";
import { getClientState, requireUser, safeNext } from "@/lib/auth";
import { NameForm } from "./name-form";

/** "Como podemos te chamar?" (primeiro acesso). */
export default function NamePage({ searchParams }: PageProps<"/app/nome">) {
  return (
    <main className="flex flex-1 flex-col gap-4 px-[22px] pb-7 pt-12">
      <h1 className="text-[26px] font-bold tracking-tight">Como podemos te chamar?</h1>
      <p className="text-[13px] text-muted">A IA usa seu nome na conversa.</p>
      <Suspense fallback={<Skeleton className="h-14" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Form({ searchParams }: Pick<PageProps<"/app/nome">, "searchParams">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null, "/app");
  const user = await requireUser("/app/entrar", `/app/nome?next=${encodeURIComponent(next)}`);
  const state = await getClientState(user);
  if (!state.termsAccepted) redirect(`/app/termos?next=${encodeURIComponent(next)}`);
  if (state.name) redirect(next);
  return <NameForm next={next} initial="" />;
}
