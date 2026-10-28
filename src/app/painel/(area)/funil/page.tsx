import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireApprovedMember } from "@/lib/auth";
import { loadLeadCards } from "@/lib/panel-leads";
import { createClient } from "@/lib/supabase/server";
import { Kanban } from "./kanban";

/** P-03 · Funil (kanban). Fechado e Perdido ficam na aba Encerrados. */
export default function FunnelPage() {
  return (
    <main className="grid gap-5 px-4 py-6 lg:px-9 lg:py-7">
      <div>
        <p className="trk">Atendimento</p>
        <h1 className="mt-1 text-[28px] font-light tracking-tight">
          <b className="font-bold">Funil</b> de leads
        </h1>
        <p className="text-[13px] text-muted">Arraste os cartões entre as etapas ou use as setas.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[480px] rounded-[20px]" />}>
        <Board />
      </Suspense>
    </main>
  );
}

async function Board() {
  const { membership } = await requireApprovedMember("/painel/funil");
  const supabase = await createClient();
  const [cards, { data: team }] = await Promise.all([
    loadLeadCards(membership.agencyId),
    supabase.rpc("agency_team", { p_agency: membership.agencyId }),
  ]);
  return (
    <Kanban
      cards={cards}
      team={(team ?? []).map((m) => ({ id: m.user_id, name: m.name }))}
      isManager={membership.role === "gestor"}
    />
  );
}
