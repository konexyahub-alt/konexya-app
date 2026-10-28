import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BrandSplit } from "@/components/panel/brand-split";
import { Icon, Skeleton } from "@/components/ui";
import { getMembership, isPlatformAdmin, requireUser } from "@/lib/auth";
import { panelSignOut } from "./actions";

/** Entrada do painel: decide para onde a pessoa vai conforme o cadastro. */
export default function PanelHome() {
  return (
    <Suspense fallback={<Skeleton className="m-10 h-40" />}>
      <Router />
    </Suspense>
  );
}

const STATUS_COPY = {
  pendente: {
    title: "Recebemos seu cadastro",
    text: "A Konexya libera o acesso após a conferência. Você recebe um e-mail quando estiver pronto.",
    tone: "ok" as const,
  },
  recusada: {
    title: "Cadastro não aprovado",
    text: "Não conseguimos confirmar os dados da imobiliária. Fale com a Konexya para entender o que falta.",
    tone: "bad" as const,
  },
  suspensa: {
    title: "Acesso suspenso",
    text: "O acesso desta imobiliária está suspenso. Fale com a Konexya.",
    tone: "bad" as const,
  },
};

async function Router() {
  const user = await requireUser("/painel/entrar");
  const membership = await getMembership(user);
  if (!membership) {
    if (await isPlatformAdmin()) redirect("/admin");
    redirect("/painel/parceiro");
  }
  if (membership.status === "aprovada") redirect("/painel/imoveis");
  const copy = STATUS_COPY[membership.status];
  return (
    <BrandSplit
      headline={
        <>
          Leads qualificados,
          <br />
          no mesmo sistema dos seus imóveis.
        </>
      }
      footnote="A Konexya confere cada cadastro antes de liberar o acesso."
    >
      <span
        className={
          copy.tone === "ok"
            ? "grid size-touch place-items-center rounded-full bg-ok-bg text-ok"
            : "grid size-touch place-items-center rounded-full bg-bad-bg text-bad"
        }
      >
        <Icon name={copy.tone === "ok" ? "check" : "alert"} />
      </span>
      <h1 className="text-[26px] font-bold tracking-tight">{copy.title}</h1>
      <p className="text-muted">{copy.text}</p>
      <p className="text-[13px] text-muted">
        {membership.agencyName} · {user.email}
      </p>
      <form action={panelSignOut}>
        <button type="submit" className="min-h-touch text-sm font-semibold underline underline-offset-4">
          Sair
        </button>
      </form>
      <Link href="/app" className="sr-only">
        Ir para o app
      </Link>
    </BrandSplit>
  );
}
