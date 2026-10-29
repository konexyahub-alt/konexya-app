import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { STANDARD_QUESTIONS, type CustomAnswer, type Qualification } from "@/lib/assistant";
import { requireApprovedMember } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { isRecent, leadProfile } from "@/lib/leads";
import { TYPE_LABELS, photoUrl, sortPhotos } from "@/lib/property";
import { qualificationItems, readiness } from "@/lib/readiness";
import { loadScoringSettings } from "@/lib/recommendations";
import { scoreProperty } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";
import { conflictingIds } from "@/lib/visits";
import { LeadWorkspace } from "./lead-workspace";

/** P-04 · Lead aberto: tudo o que o corretor precisa para atender sem sair da tela. */
export default function LeadPage({ params }: PageProps<"/painel/leads/[id]">) {
  return (
    <Suspense fallback={<LeadSkeleton />}>
      <Lead params={params} />
    </Suspense>
  );
}

async function Lead({ params }: Pick<PageProps<"/painel/leads/[id]">, "params">) {
  const { id } = await params;
  const { user, membership } = await requireApprovedMember(`/painel/leads/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) notFound();

  const [messages, suggestion, questions, notes, activity, team, settings, assistant] = await Promise.all([
    supabase.from("lead_messages").select("id, sender, author_id, body, created_at").eq("lead_id", id).order("id").limit(400),
    supabase
      .from("ai_suggestions")
      .select("id, body")
      .eq("lead_id", id)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("lead_questions").select("id, body, status, created_at").eq("lead_id", id).order("created_at"),
    supabase.from("internal_notes").select("id, author_id, body, created_at").eq("lead_id", id).order("created_at"),
    supabase.rpc("lead_property_activity", { p_lead: id }),
    supabase.rpc("agency_team", { p_agency: lead.agency_id }),
    loadScoringSettings(supabase),
    supabase.from("agency_assistant_settings").select("name").eq("agency_id", lead.agency_id).maybeSingle(),
  ]);

  const [{ data: visitRows }, { data: proposalRows }] = await Promise.all([
    supabase.from("visits").select("id, starts_at, duration_min, status, property_id, broker_id").eq("lead_id", id).order("starts_at"),
    supabase
      .from("proposals")
      .select("id, amount, status, counter_amount, made_by, property_id, created_at, client_accepted_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
  ]);
  // Horário duplicado: confere contra as outras visitas ativas do mesmo corretor (o RLS limita ao que a pessoa vê).
  const brokerIds = [...new Set((visitRows ?? []).map((v) => v.broker_id).filter((x): x is string => !!x))];
  const { data: brokerVisits } = brokerIds.length
    ? await supabase.from("visits").select("id, starts_at, duration_min, status, broker_id").in("broker_id", brokerIds).in("status", ["pedida", "confirmada"])
    : { data: [] };
  const conflicts = conflictingIds(
    (brokerVisits ?? []).map((v) => ({ id: v.id, brokerId: v.broker_id, startsAt: v.starts_at, durationMin: v.duration_min, status: v.status })),
  );

  const profile = leadProfile(lead);
  const activityRows = activity.data ?? [];
  const propertyIds = [
    ...new Set([
      ...lead.interest_property_ids,
      ...activityRows.map((a) => a.property_id),
      ...(visitRows ?? []).map((v) => v.property_id),
      ...(proposalRows ?? []).map((x) => x.property_id),
    ].filter((x): x is string => !!x)),
  ];
  const { data: props } = propertyIds.length
    ? await supabase
        .from("properties")
        .select("*, property_photos(storage_path, source_url, position, is_cover)")
        .in("id", propertyIds)
    : { data: [] };
  const base = publicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const names = new Map((team.data ?? []).map((m) => [m.user_id, m.name]));
  const qualification = (lead.qualification ?? {}) as Qualification;
  const recentMs = 15 * 60_000;

  const properties = (props ?? []).map((p) => {
    const s = scoreProperty(p, profile, settings.weights);
    const act = activityRows.find((a) => a.property_id === p.id);
    const cover = sortPhotos(p.property_photos)[0];
    return {
      id: p.id,
      title: p.title ?? TYPE_LABELS[p.type],
      neighborhood: p.neighborhood,
      price: p.price,
      photoUrl: cover ? photoUrl(cover, base) : null,
      score: s?.score ?? null,
      reasons: s?.reasons.slice(0, 2).map((r) => ({ band: r.band, text: r.text })) ?? [],
      interest: lead.interest_property_ids.includes(p.id),
      saved: act?.saved ?? false,
      viewed: !!act?.viewed_at,
    };
  });

  return (
    <LeadWorkspace
      lead={{
        id: lead.id,
        clientName: lead.client_name,
        stage: lead.stage,
        brokerId: lead.broker_id,
        sharedAt: lead.created_at,
        revoked: !!lead.consent_revoked_at,
        summary: lead.ai_summary,
        assistantActive: lead.assistant_active,
        firstResponseAt: lead.first_human_response_at,
        createdAt: lead.created_at,
      }}
      readiness={readiness(profile)}
      qualification={qualificationItems(profile, qualification, lead.created_at).map((q) => {
        const key = (Object.keys(STANDARD_QUESTIONS) as (keyof typeof STANDARD_QUESTIONS)[]).find(
          (k) => STANDARD_QUESTIONS[k].label === q.label,
        );
        const at = key ? qualification[key]?.at : null;
        return { ...q, fresh: isRecent(at, recentMs) };
      })}
      customAnswers={((lead.custom_answers ?? []) as CustomAnswer[]).map((a) => ({
        question: a.question,
        answer: a.answer,
        fresh: isRecent(a.at, recentMs),
      }))}
      questions={(questions.data ?? []).map((q) => ({ id: q.id, body: q.body, open: q.status === "encaminhada" }))}
      properties={properties}
      messages={(messages.data ?? []).map((m) => ({
        id: m.id,
        sender: m.sender,
        author: m.author_id ? (names.get(m.author_id) ?? "Equipe") : null,
        body: m.body,
        at: m.created_at,
      }))}
      suggestion={suggestion.data ?? null}
      notes={(notes.data ?? []).map((n) => ({ id: n.id, author: names.get(n.author_id) ?? "Equipe", body: n.body, at: n.created_at }))}
      team={(team.data ?? []).filter((m) => m.active).map((m) => ({ id: m.user_id, name: m.name }))}
      canAssign={membership.role === "gestor"}
      me={user.id}
      assistantName={assistant.data?.name ?? "Assistente"}
      visits={(visitRows ?? []).map((v) => ({
        id: v.id,
        startsAt: v.starts_at,
        status: v.status,
        propertyTitle: properties.find((x) => x.id === v.property_id)?.title ?? "Imóvel",
        conflict: conflicts.has(v.id),
      }))}
      proposals={(proposalRows ?? []).map((x) => {
        const prop = properties.find((y) => y.id === x.property_id);
        return {
          id: x.id,
          amount: Number(x.amount),
          status: x.status,
          counterAmount: x.counter_amount === null ? null : Number(x.counter_amount),
          madeBy: x.made_by === "cliente" ? ("cliente" as const) : ("corretor" as const),
          propertyTitle: prop?.title ?? "Imóvel",
          askingPrice: prop?.price === null || prop?.price === undefined ? null : Number(prop.price),
          createdAt: x.created_at,
          clientAcceptedAt: x.client_accepted_at,
        };
      })}
    />
  );
}

function LeadSkeleton() {
  return (
    <div className="grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] 2xl:grid-cols-[320px_1fr_300px]">
      <Skeleton className="h-[520px] rounded-[20px]" />
      <Skeleton className="h-[520px] rounded-[20px]" />
      <Skeleton className="hidden h-[520px] rounded-[20px] 2xl:block" />
    </div>
  );
}
