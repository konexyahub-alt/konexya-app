import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireApprovedMember } from "@/lib/auth";
import { loadLeadCards } from "@/lib/panel-leads";
import { LeadsList } from "./leads-list";

/**
 * Leads: todos os leads que a pessoa pode ver (gestor, a imobiliária toda; corretor, os seus), em lista com
 * busca e filtros. O Funil mostra o andamento por etapa; aqui é para achar e atender (docs/DECISOES.md).
 */
export default function LeadsPage() {
  return (
    <main className="grid content-start gap-5 px-4 py-6 lg:px-9 lg:py-7">
      <div>
        <p className="trk">Atendimento</p>
        <h1 className="mt-1 text-[28px] font-light tracking-tight">
          <b className="font-bold">Leads</b>
        </h1>
        <p className="text-[13px] text-muted">Busque pelo nome ou filtre para achar quem atender agora.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[420px] rounded-[20px]" />}>
        <List />
      </Suspense>
    </main>
  );
}

async function List() {
  const { user, membership } = await requireApprovedMember("/painel/leads");
  const cards = await loadLeadCards(membership.agencyId);
  return <LeadsList cards={cards} userId={user.id} isManager={membership.role === "gestor"} />;
}
