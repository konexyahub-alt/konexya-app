import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Icon, Skeleton } from "@/components/ui";
import { getClientState, requireUser, safeNext } from "@/lib/auth";
import { TermsForm } from "./terms-form";

/** Aceite dos termos no primeiro acesso (fluxo F1). */
export default function TermsPage({ searchParams }: PageProps<"/app/termos">) {
  return (
    <main className="flex flex-1 flex-col gap-4 px-[22px] pb-7 pt-12">
      <h1 className="text-[26px] font-bold tracking-tight">Antes de começar</h1>
      <p className="text-[13px] text-muted">Leia e aceite para usar a Konexya.</p>
      <section className="grid gap-3 rounded-card border border-line p-4">
        <p className="flex items-center gap-2.5 font-bold">
          <Icon name="shield" /> Seus dados ficam com você
        </p>
        <p className="text-[13px] text-muted">
          A Konexya só compartilha o seu perfil com uma imobiliária quando você autorizar, e uma imobiliária por vez.
        </p>
        <p className="text-[13px] text-muted">
          Os endereços da sua rotina nunca são enviados. A imobiliária vê só os tempos de deslocamento.
        </p>
        <p className="text-[13px] text-muted">
          Você pode ver, corrigir, baixar ou excluir seus dados quando quiser, na aba Perfil.
        </p>
      </section>
      <Suspense fallback={<Skeleton className="h-12" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Form({ searchParams }: Pick<PageProps<"/app/termos">, "searchParams">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null, "/app");
  const user = await requireUser("/app/entrar", `/app/termos?next=${encodeURIComponent(next)}`);
  const state = await getClientState(user);
  if (state.termsAccepted) redirect(next);
  return <TermsForm next={next} />;
}
