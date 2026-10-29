import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { mondayOf, weekRange } from "@/lib/agenda";
import { requireApprovedMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { conflictingIds } from "@/lib/visits";
import { AgendaView, type AgendaVisit } from "./agenda-view";

/**
 * P-05 · Agenda de visitas. Uma aba só: semana em grade no computador; semana + dia com filtros no celular.
 * O RLS decide o que aparece: o gestor vê a imobiliária toda (com filtro por corretor), o corretor só as suas.
 */
export default function AgendaPage({ searchParams }: PageProps<"/painel/agenda">) {
  return (
    <main className="grid content-start gap-5 px-4 py-6 lg:px-9 lg:py-7">
      <Suspense fallback={<Skeleton className="h-[520px] rounded-[20px]" />}>
        <Agenda searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Agenda({ searchParams }: Pick<PageProps<"/painel/agenda">, "searchParams">) {
  const { membership } = await requireApprovedMember("/painel/agenda");
  const params = await searchParams;
  const monday = mondayOf(one(params.semana));
  const { from, to } = weekRange(monday);
  const supabase = await createClient();
  const isManager = membership.role === "gestor" && !membership.autonomous;
  const [{ data: rows }, { data: team }] = await Promise.all([
    supabase
      .from("visits")
      .select("id, lead_id, broker_id, property_id, starts_at, duration_min, status, leads(client_name, consent_revoked_at), properties(title, neighborhood)")
      .eq("agency_id", membership.agencyId)
      .gte("starts_at", from)
      .lt("starts_at", to)
      .order("starts_at"),
    supabase.rpc("agency_team", { p_agency: membership.agencyId }),
  ]);
  const list = rows ?? [];
  const conflicts = conflictingIds(list.map((v) => ({ id: v.id, brokerId: v.broker_id, startsAt: v.starts_at, durationMin: v.duration_min, status: v.status })));
  const names = new Map((team ?? []).map((m) => [m.user_id, m.name]));
  const visits: AgendaVisit[] = list.map((v) => ({
    id: v.id,
    leadId: v.lead_id,
    brokerId: v.broker_id,
    brokerName: v.broker_id ? (names.get(v.broker_id) ?? null) : null,
    clientName: v.leads?.client_name ?? "Cliente",
    revoked: !!v.leads?.consent_revoked_at,
    propertyTitle: v.properties?.title ?? "Imóvel removido",
    neighborhood: v.properties?.neighborhood ?? null,
    canOfferOther: !!v.property_id,
    startsAt: v.starts_at,
    status: v.status,
    conflict: conflicts.has(v.id),
  }));
  const brokers = isManager
    ? (team ?? []).filter((m) => m.active).map((m) => ({ id: m.user_id, name: m.name }))
    : [];
  return (
    <AgendaView
      key={monday}
      monday={monday}
      visits={visits}
      brokers={brokers}
      initialBroker={one(params.corretor) ?? ""}
      initialFilter={one(params.filtro) === "aguardando" ? "aguardando" : one(params.filtro) === "confirmadas" ? "confirmadas" : "todas"}
      initialDay={one(params.dia)}
    />
  );
}
