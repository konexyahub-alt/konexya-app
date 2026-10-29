import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireApprovedMember } from "@/lib/auth";
import { loadLeadCards } from "@/lib/panel-leads";
import { LeadsList, type Filter } from "./leads-list";

/**
 * Leads: todos os leads que a pessoa pode ver (gestor, a imobiliária toda; corretor, os seus), em lista com
 * busca e filtros. O Funil mostra o andamento por etapa; aqui é para achar e atender (docs/DECISOES.md).
 */
export default function LeadsPage({ searchParams }: PageProps<"/painel/leads">) {
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
        <List searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const FILTERS: Filter[] = ["andamento", "aguardando", "parados", "encerrados"];
const isDay = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

async function List({ searchParams }: Pick<PageProps<"/painel/leads">, "searchParams">) {
  const { user, membership } = await requireApprovedMember("/painel/leads");
  const [cards, params] = await Promise.all([loadLeadCards(membership.agencyId), searchParams]);
  const filter = one(params.filtro);
  const period = one(params.periodo);
  return (
    <LeadsList
      cards={cards}
      userId={user.id}
      isManager={membership.role === "gestor"}
      initial={{
        filter: FILTERS.includes(filter as Filter) ? (filter as Filter) : undefined,
        stage: one(params.etapa),
        broker: one(params.corretor),
        reason: one(params.motivo),
        period: period && ["7", "30", "90"].includes(period) ? period : undefined,
        from: isDay(one(params.de)),
        to: isDay(one(params.ate)),
      }}
    />
  );
}
