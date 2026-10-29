import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EmptyState, Skeleton, buttonClasses } from "@/components/ui";
import { requireApprovedMember } from "@/lib/auth";
import { OPEN_STAGES } from "@/lib/leads";
import { loadLeadCards } from "@/lib/panel-leads";

/**
 * P-04 sem lead escolhido: abre o próximo que espera por você; se nenhum espera, o lead em andamento com a
 * conversa mais recente (responder um lead não pode fazê-lo sumir do menu). Sem leads em andamento, estado vazio.
 */
export default function LeadsIndex() {
  return (
    <main className="grid gap-5 px-4 py-6 lg:px-9 lg:py-7">
      <Suspense fallback={<Skeleton className="h-60 rounded-[20px]" />}>
        <Next />
      </Suspense>
    </main>
  );
}

async function Next() {
  const { membership } = await requireApprovedMember("/painel/leads");
  const cards = await loadLeadCards(membership.agencyId);
  // Os cartões já vêm da conversa mais recente para a mais antiga.
  const next = cards.find((c) => c.awaiting) ?? cards.find((c) => OPEN_STAGES.includes(c.stage));
  if (next) redirect(`/painel/leads/${next.id}`);
  return (
    <EmptyState
      className="mx-auto mt-16 max-w-md"
      title="Nenhum lead aberto."
      description="Escolha um no Funil ou no Painel."
      action={
        <Link href="/painel/funil" className={buttonClasses({ variant: "secondary", size: "sm" })}>
          Abrir o funil
        </Link>
      }
    />
  );
}
