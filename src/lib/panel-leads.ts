import "server-only";
import { isAwaiting, isStalled, leadProfile, searchLine, type LeadRow } from "@/lib/leads";
import { budgetLabel } from "@/lib/profile";
import { loadScoringSettings } from "@/lib/recommendations";
import { scoreProperty } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";

export type LeadCard = {
  id: string;
  name: string;
  stage: LeadRow["stage"];
  search: string;
  budget: string | null;
  score: number | null;
  brokerId: string | null;
  brokerName: string | null;
  stageChangedAt: string;
  createdAt: string;
  firstResponseAt: string | null;
  awaiting: boolean;
  stalled: boolean;
  revoked: boolean;
  hasSuggestion: boolean;
  lostReason: LeadRow["lost_reason"];
};

/**
 * Leads que a pessoa pode ver (o RLS decide: gestor vê a imobiliária toda, corretor só os seus), já com o
 * que o funil e o painel mostram. A nota é a do imóvel de origem, calculada pelo código (regra 7).
 */
export async function loadLeadCards(agencyId: string): Promise<LeadCard[]> {
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("agency_id", agencyId)
    .order("last_message_at", { ascending: false })
    .limit(500);
  const list = leads ?? [];
  if (!list.length) return [];
  const ids = list.map((l) => l.id);
  const origins = [...new Set(list.map((l) => l.origin_property_id).filter((x): x is string => !!x))];
  const [{ data: questions }, { data: suggestions }, { data: team }, { data: props }, settings] = await Promise.all([
    supabase.from("lead_questions").select("lead_id").in("lead_id", ids).eq("status", "encaminhada"),
    supabase.from("ai_suggestions").select("lead_id").in("lead_id", ids).eq("status", "pendente"),
    supabase.rpc("agency_team", { p_agency: agencyId }),
    origins.length ? supabase.from("properties").select("*").in("id", origins) : Promise.resolve({ data: [] }),
    loadScoringSettings(supabase),
  ]);
  const names = new Map((team ?? []).map((m) => [m.user_id, m.name]));
  return list.map((l) => {
    const profile = leadProfile(l);
    const origin = (props ?? []).find((p) => p.id === l.origin_property_id);
    const openQ = (questions ?? []).filter((q) => q.lead_id === l.id).length;
    return {
      id: l.id,
      name: l.client_name,
      stage: l.stage,
      search: searchLine(profile),
      budget: budgetLabel(profile),
      score: origin ? (scoreProperty(origin, profile, settings.weights)?.score ?? null) : null,
      brokerId: l.broker_id,
      brokerName: l.broker_id ? (names.get(l.broker_id) ?? null) : null,
      stageChangedAt: l.stage_changed_at,
      createdAt: l.created_at,
      firstResponseAt: l.first_human_response_at,
      awaiting: isAwaiting(l, openQ),
      stalled: isStalled(l),
      revoked: !!l.consent_revoked_at,
      hasSuggestion: (suggestions ?? []).some((s) => s.lead_id === l.id),
      lostReason: l.lost_reason,
    };
  });
}
