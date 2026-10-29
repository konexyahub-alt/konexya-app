import "server-only";
import { isStandardQuestion, STANDARD_QUESTIONS, type AssistantQuestion } from "@/lib/assistant";
import { OPEN_STAGES, isStalled, type LeadRow } from "@/lib/leads";
import {
  FUNNEL,
  avgReplyMs,
  firstMessageKinds,
  firstResponse,
  funnel,
  inPeriod,
  isOffHours,
  perDay,
  perHour,
  stageDurations,
  type Period,
} from "@/lib/metrics";
import { createClient } from "@/lib/supabase/server";

/**
 * Lê do banco tudo o que as Métricas mostram (o RLS e as funções garantem que é só da própria imobiliária)
 * e calcula os números do período e do anterior. Leitura só do gestor.
 */
export async function loadMetrics(agencyId: string, current: Period, previous: Period, broker: string | null) {
  const supabase = await createClient();
  const since = new Date(previous.from).toISOString();
  const [leadsQ, eventsQ, msgsQ, suggQ, questQ, visitsQ, propsQ, propertiesQ, statsCur, statsPrev, teamQ, assistantQ] = await Promise.all([
    supabase
      .from("leads")
      .select("id, created_at, first_human_response_at, broker_id, stage, stage_changed_at, lost_reason, consent_revoked_at, origin_property_id, assistant_queue, qualification, custom_answers, last_message_at")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("lead_stage_events").select("lead_id, stage, at, leads!inner(agency_id)").eq("leads.agency_id", agencyId).gte("at", since).limit(20000),
    supabase
      .from("lead_messages")
      .select("lead_id, sender, body, created_at, leads!inner(agency_id)")
      .eq("leads.agency_id", agencyId)
      .gte("created_at", since)
      .in("sender", ["cliente", "corretor", "assistente"])
      .limit(30000),
    supabase.from("ai_suggestions").select("lead_id, status, final_body, created_at, leads!inner(agency_id)").eq("leads.agency_id", agencyId).gte("created_at", since).limit(10000),
    supabase.from("lead_questions").select("lead_id, status, created_at, leads!inner(agency_id)").eq("leads.agency_id", agencyId).gte("created_at", since).limit(10000),
    supabase.from("visits").select("lead_id, broker_id, property_id, status, starts_at").eq("agency_id", agencyId).limit(10000),
    supabase.from("proposals").select("lead_id, property_id, status, created_at").eq("agency_id", agencyId).limit(10000),
    supabase.from("properties").select("id, title, status, has_seal, broker_id").eq("agency_id", agencyId),
    supabase.rpc("agency_property_stats", { p_agency: agencyId, p_from: new Date(current.from).toISOString(), p_to: new Date(current.to).toISOString() }),
    supabase.rpc("agency_property_stats", { p_agency: agencyId, p_from: since, p_to: new Date(previous.to).toISOString() }),
    supabase.rpc("agency_team", { p_agency: agencyId }),
    supabase.from("agency_assistant_settings").select("name, questions, distribution, enabled").eq("agency_id", agencyId).maybeSingle(),
  ]);

  const allLeads = (leadsQ.data ?? []) as (Pick<LeadRow, "id" | "created_at" | "first_human_response_at" | "broker_id" | "stage" | "stage_changed_at" | "lost_reason" | "consent_revoked_at" | "origin_property_id" | "assistant_queue" | "custom_answers" | "last_message_at"> & { qualification: Record<string, unknown> })[];
  const scoped = broker ? allLeads.filter((l) => l.broker_id === broker) : allLeads;
  const scopedIds = new Set(scoped.map((l) => l.id));
  const leadById = new Map(allLeads.map((l) => [l.id, l]));
  const messages = (msgsQ.data ?? []).filter((m) => scopedIds.has(m.lead_id));
  const events = (eventsQ.data ?? []).filter((e) => scopedIds.has(e.lead_id));
  const suggestions = (suggQ.data ?? []).filter((s) => scopedIds.has(s.lead_id));
  const questions = (questQ.data ?? []).filter((q) => scopedIds.has(q.lead_id));
  const visits = (visitsQ.data ?? []).filter((v) => !broker || v.broker_id === broker);
  const proposals = (propsQ.data ?? []).filter((p) => scopedIds.has(p.lead_id));
  const properties = (propertiesQ.data ?? []).filter((p) => !broker || p.broker_id === broker);
  const team = teamQ.data ?? [];

  const leadsIn = (p: Period) => scoped.filter((l) => inPeriod(l.created_at, p));
  const cur = leadsIn(current);
  const prev = leadsIn(previous);
  const closedIn = (p: Period) => scoped.filter((l) => l.stage === "fechado" && inPeriod(l.stage_changed_at, p)).length;
  const visitsDone = (p: Period) => visits.filter((v) => v.status === "realizada" && inPeriod(v.starts_at, p)).length;
  const proposalsIn = (p: Period) => proposals.filter((x) => inPeriod(x.created_at, p)).length;
  const conversion = (p: Period, n: number) => (n ? closedIn(p) / n : null);

  // Visão geral
  const overview = {
    first: firstResponse(cur, current),
    firstPrev: firstResponse(prev, previous),
    leads: cur.length,
    leadsPrev: prev.length,
    visitsDone: visitsDone(current),
    visitsDonePrev: visitsDone(previous),
    proposals: proposalsIn(current),
    proposalsPrev: proposalsIn(previous),
    closed: closedIn(current),
    closedPrev: closedIn(previous),
    conversion: conversion(current, cur.length),
    conversionPrev: conversion(previous, prev.length),
    perDay: perDay(cur.map((l) => l.created_at), current),
    attention: {
      stalled: scoped.filter((l) => isStalled(l)).length,
      visitsPending: visits.filter((v) => v.status === "pedida" && new Date(v.starts_at).getTime() >= Date.now()).length,
      proposalsPending: proposals.filter((x) => x.status === "recebida").length,
      noSeal: properties.filter((p) => p.status === "publicado" && !p.has_seal).length,
    },
  };

  // Atendimento e equipe
  const off = cur.filter((l) => isOffHours(l.created_at)).length;
  const byBroker = team
    .filter((m) => m.active && (!broker || m.user_id === broker))
    .map((m) => {
      const mine = cur.filter((l) => l.broker_id === m.user_id);
      return {
        id: m.user_id,
        name: m.role === "gestor" ? `${m.name} (gestor)` : m.name,
        first: firstResponse(mine, current).avgMs,
        reply: avgReplyMs(messages.filter((x) => scopedIds.has(x.lead_id) && leadById.get(x.lead_id)?.broker_id === m.user_id), current),
        leads: mine.length,
        visits: visits.filter((v) => v.broker_id === m.user_id && v.status === "realizada" && inPeriod(v.starts_at, current)).length,
        closed: scoped.filter((l) => l.broker_id === m.user_id && l.stage === "fechado" && inPeriod(l.stage_changed_at, current)).length,
        inRotation: m.in_rotation,
      };
    });
  const service = {
    first: overview.first,
    firstPrev: overview.firstPrev,
    reply: avgReplyMs(messages, current),
    replyPrev: avgReplyMs(messages, previous),
    offHours: off,
    offShare: cur.length ? off / cur.length : null,
    perHour: perHour(cur.map((l) => l.created_at)),
    byBroker,
    distribution: assistantQ.data?.distribution ?? "rodizio",
    firstKinds: firstMessageKinds(
      messages.filter((m) => m.sender === "corretor"),
      suggestions,
      new Set(cur.map((l) => l.id)),
    ),
  };

  // Funil e conversão
  const lostIn = scoped.filter((l) => l.stage === "perdido" && l.lost_reason && inPeriod(l.stage_changed_at, current));
  const reasons = new Map<string, number>();
  for (const l of lostIn) reasons.set(l.lost_reason!, (reasons.get(l.lost_reason!) ?? 0) + 1);
  const funnelCounts = funnel(cur, events);
  const funnelData = {
    steps: FUNNEL.map((f, i) => ({ key: f.key, label: f.label, count: funnelCounts[i], ofPrev: i === 0 || !funnelCounts[i - 1] ? null : funnelCounts[i] / funnelCounts[i - 1] })),
    durations: stageDurations(events, current),
    lost: [...reasons.entries()].sort((a, b) => b[1] - a[1]),
    visits: {
      confirmed: visits.filter((v) => (v.status === "confirmada" || v.status === "realizada" || v.status === "nao_compareceu") && inPeriod(v.starts_at, current)).length,
      done: visitsDone(current),
      noShow: visits.filter((v) => v.status === "nao_compareceu" && inPeriod(v.starts_at, current)).length,
      proposals: proposalsIn(current),
      counter: proposals.filter((x) => x.status === "contraproposta" && inPeriod(x.created_at, current)).length,
      accepted: proposals.filter((x) => x.status === "aceita" && inPeriod(x.created_at, current)).length,
    },
  };

  // Imóveis
  const statsOf = (rows: { property_id: string; views: number; saves: number }[] | null) => new Map((rows ?? []).map((r) => [r.property_id, r]));
  const sCur = statsOf(statsCur.data);
  const sPrev = statsOf(statsPrev.data);
  const sum = (m: Map<string, { views: number; saves: number }>, k: "views" | "saves") =>
    properties.reduce((s, p) => s + Number(m.get(p.id)?.[k] ?? 0), 0);
  const leadsByProperty = (p: Period) => {
    const out = new Map<string, number>();
    for (const l of leadsIn(p)) if (l.origin_property_id) out.set(l.origin_property_id, (out.get(l.origin_property_id) ?? 0) + 1);
    return out;
  };
  const lCur = leadsByProperty(current);
  const published = properties.filter((p) => p.status === "publicado");
  const rows = properties
    .map((p) => ({
      id: p.id,
      title: p.title ?? "Imóvel sem título",
      views: Number(sCur.get(p.id)?.views ?? 0),
      saves: Number(sCur.get(p.id)?.saves ?? 0),
      leads: lCur.get(p.id) ?? 0,
      visits: visits.filter((v) => v.property_id === p.id && v.status === "realizada" && inPeriod(v.starts_at, current)).length,
      seal: p.has_seal,
    }))
    .filter((r) => r.views || r.saves || r.leads || r.visits || published.some((p) => p.id === r.id))
    .sort((a, b) => b.views - a.views || b.leads - a.leads);
  // Comparação "com selo × sem selo" só quando há volume para não tirar conclusão de pouco dado.
  const group = (seal: boolean) => rows.filter((r) => r.seal === seal).reduce((s, r) => ({ v: s.v + r.views, l: s.l + r.leads }), { v: 0, l: 0 });
  const withSeal = group(true);
  const noSeal = group(false);
  const sealRatio = withSeal.v >= 100 && noSeal.v >= 100 && noSeal.l > 0 ? withSeal.l / withSeal.v / (noSeal.l / noSeal.v) : null;
  const propertiesData = {
    views: sum(sCur, "views"),
    viewsPrev: sum(sPrev, "views"),
    saves: sum(sCur, "saves"),
    savesPrev: sum(sPrev, "saves"),
    leads: cur.filter((l) => l.origin_property_id).length,
    leadsPrev: prev.filter((l) => l.origin_property_id).length,
    sealed: published.filter((p) => p.has_seal).length,
    published: published.length,
    rows,
    sealRatio,
  };

  // IA e assistente
  const decided = (p: Period) => suggestions.filter((s) => s.status !== "pendente" && inPeriod(s.created_at, p));
  const share = (p: Period, status: string) => {
    const d = decided(p);
    return d.length ? d.filter((s) => s.status === status).length / d.length : null;
  };
  const assistantLeads = new Set(messages.filter((m) => m.sender === "assistente" && inPeriod(m.created_at, current)).map((m) => m.lead_id));
  const served = cur.filter((l) => assistantLeads.has(l.id));
  const settingsQuestions = ((assistantQ.data?.questions ?? []) as AssistantQuestion[]).filter((q) => q.enabled);
  const answered = (l: (typeof cur)[number], q: AssistantQuestion) =>
    isStandardQuestion(q.id) ? !!l.qualification?.[q.id] : ((l.custom_answers ?? []) as { question?: string }[]).some((a) => a.question === q.text);
  const ai = {
    approved: share(current, "aprovada"),
    approvedPrev: share(previous, "aprovada"),
    edited: share(current, "editada"),
    editedPrev: share(previous, "editada"),
    discarded: share(current, "descartada"),
    discardedPrev: share(previous, "descartada"),
    decided: decided(current).length,
    assistantName: assistantQ.data?.name ?? "Assistente",
    assistantEnabled: assistantQ.data?.enabled ?? false,
    served: served.length,
    servedShare: cur.length ? served.length / cur.length : null,
    answers: served.reduce((s, l) => s + settingsQuestions.filter((q) => answered(l, q)).length, 0),
    completed: served.filter((l) => settingsQuestions.every((q) => answered(l, q))).length,
    forwarded: questions.filter((q) => inPeriod(q.created_at, current)).length,
    perQuestion: settingsQuestions.map((q) => ({
      id: q.id,
      text: q.text || (isStandardQuestion(q.id) ? STANDARD_QUESTIONS[q.id].label : "Pergunta"),
      share: served.length ? served.filter((l) => answered(l, q)).length / served.length : null,
    })),
  };

  return { overview, service, funnel: funnelData, properties: propertiesData, ai, brokers: team.filter((m) => m.active).map((m) => ({ id: m.user_id, name: m.name })), openStages: OPEN_STAGES };
}

export type Metrics = Awaited<ReturnType<typeof loadMetrics>>;
