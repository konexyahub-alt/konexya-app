import type { Database } from "@/lib/supabase/database.types";
import { budgetLabel, toProfile, KIND_LABELS, type Profile } from "@/lib/profile";

/** Funil (I6) e dados derivados do lead para o painel (P-02, P-03, P-04). */
export type LeadStage = Database["public"]["Enums"]["lead_stage"];
export type LostReason = Database["public"]["Enums"]["lost_reason"];
export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export const OPEN_STAGES: LeadStage[] = ["novo", "em_atendimento", "qualificado", "visita_agendada", "proposta", "negociacao"];
export const CLOSED_STAGES: LeadStage[] = ["fechado", "perdido"];

export const STAGE_LABELS: Record<LeadStage, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  qualificado: "Qualificado",
  visita_agendada: "Visita agendada",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  preco: "Preço",
  localizacao: "Localização",
  desistiu: "Desistiu",
  comprou_com_outro: "Comprou com outro",
  sem_resposta: "Sem resposta",
  outro: "Outro",
};

export const STALLED_MS = 48 * 3600_000;

/** Lead parado: etapa aberta sem movimento na conversa há mais de 48 h (revogado não conta: não há o que fazer). */
export function isStalled(
  lead: Pick<LeadRow, "stage" | "last_message_at"> & Partial<Pick<LeadRow, "consent_revoked_at">>,
  now = Date.now(),
): boolean {
  if (lead.consent_revoked_at) return false;
  return OPEN_STAGES.includes(lead.stage) && now - new Date(lead.last_message_at).getTime() > STALLED_MS;
}

/** "Aguardando você": ainda sem primeira resposta humana ou com dúvida encaminhada em aberto. */
export function isAwaiting(lead: Pick<LeadRow, "first_human_response_at" | "consent_revoked_at">, openQuestions = 0): boolean {
  if (lead.consent_revoked_at) return false;
  return !lead.first_human_response_at || openQuestions > 0;
}

/** O que o cliente busca, em uma linha ("3+ quartos · Apartamento · Cocó"). */
export function searchLine(p: Profile): string {
  const parts = [
    p.bedrooms_min ? `${p.bedrooms_min}+ quartos` : null,
    p.property_kind && p.property_kind !== "tanto_faz" ? KIND_LABELS[p.property_kind] : null,
    p.neighborhoods.length ? p.neighborhoods.slice(0, 2).join(", ") : p.work_neighborhood ? `perto de ${p.work_neighborhood}` : null,
    p.purpose === "alugar" ? "aluguel" : null,
  ].filter(Boolean);
  return parts.join(" · ") || "Perfil em construção";
}

export function leadProfile(lead: Pick<LeadRow, "profile_snapshot">): Profile {
  return toProfile(lead.profile_snapshot as Record<string, unknown>);
}

export { budgetLabel };

/** "há 25 min", "há 2 h", "ontem", "há 3 dias". */
export function timeAgo(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

/** Duração legível ("12 min", "1 h 05 min"). */
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h} h ${String(rest).padStart(2, "0")} min` : `${h} h`;
}

/** Agora, em milissegundos (no servidor, a cada requisição). */
export function nowMs(): number {
  return Date.now();
}

/** Aconteceu há menos de `ms`? */
export function isRecent(iso: string | null | undefined, ms: number): boolean {
  return !!iso && Date.now() - new Date(iso).getTime() < ms;
}
