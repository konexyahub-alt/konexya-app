import type { Database } from "@/lib/supabase/database.types";

/**
 * Métricas do painel (P-09, docs/DECISOES.md). Tudo calculado a partir do banco, nunca estimado: quando falta
 * dado, a tela mostra estado vazio. Horários no fuso de Fortaleza (UTC−3, sem horário de verão).
 */
type LeadStage = Database["public"]["Enums"]["lead_stage"];

const DAY = 86_400_000;
const OFFSET = 3 * 3_600_000;

export type Period = { from: number; to: number; days: number; label: string };
export type PeriodKind = "7" | "30" | "90" | "custom";

/** Período escolhido e o anterior, do mesmo tamanho, para a comparação. */
export function periodRange(kind: PeriodKind, de: string | undefined, ate: string | undefined, now: number): { current: Period; previous: Period } {
  const startOfDay = (ms: number) => Math.floor((ms - OFFSET) / DAY) * DAY + OFFSET;
  let from: number;
  let to: number;
  const valid = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00-03:00`));
  if (kind === "custom" && valid(de) && valid(ate) && de! <= ate!) {
    from = Date.parse(`${de}T00:00:00-03:00`);
    to = Math.min(Date.parse(`${ate}T00:00:00-03:00`) + DAY, now);
  } else {
    const days = kind === "7" ? 7 : kind === "90" ? 90 : 30;
    to = now;
    from = startOfDay(now) - (days - 1) * DAY;
  }
  const days = Math.max(1, Math.ceil((to - from) / DAY));
  const len = to - from;
  const label = kind === "custom" && valid(de) ? "período anterior do mesmo tamanho" : `${days} dias anteriores`;
  return { current: { from, to, days, label: "" }, previous: { from: from - len, to: from, days, label } };
}

export const inPeriod = (iso: string | null | undefined, p: Pick<Period, "from" | "to">) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= p.from && t < p.to;
};

/** Dia (AAAA-MM-DD) e hora em Fortaleza. */
export const localDay = (ms: number) => new Date(ms - OFFSET).toISOString().slice(0, 10);
export const localHour = (iso: string) => new Date(new Date(iso).getTime() - OFFSET).getUTCHours();

/** Horário comercial: segunda a sexta das 8h às 18h e sábado das 8h às 12h. */
export function isOffHours(iso: string): boolean {
  const d = new Date(new Date(iso).getTime() - OFFSET);
  const wd = d.getUTCDay();
  const h = d.getUTCHours();
  if (wd === 0) return true;
  if (wd === 6) return h < 8 || h >= 12;
  return h < 8 || h >= 18;
}

type LeadLike = { id: string; created_at: string; first_human_response_at: string | null };

/** Média do tempo até a primeira mensagem humana dos leads que chegaram no período (métrica central). */
export function firstResponse(leads: LeadLike[], p: Period) {
  const answered = leads.filter((l) => inPeriod(l.created_at, p) && l.first_human_response_at);
  const times = answered.map((l) => new Date(l.first_human_response_at!).getTime() - new Date(l.created_at).getTime());
  return {
    avgMs: times.length ? times.reduce((s, x) => s + x, 0) / times.length : null,
    within15: times.length ? times.filter((t) => t <= 15 * 60_000).length / times.length : null,
    count: times.length,
  };
}

type Msg = { lead_id: string; sender: string; created_at: string };

/**
 * Tempo médio de resposta durante a conversa: da primeira mensagem do cliente sem resposta até a próxima
 * mensagem do corretor. Conta as respostas dadas no período.
 */
export function avgReplyMs(messages: Msg[], p: Period): number | null {
  const byLead = new Map<string, Msg[]>();
  for (const m of messages) byLead.set(m.lead_id, [...(byLead.get(m.lead_id) ?? []), m]);
  const times: number[] = [];
  for (const list of byLead.values()) {
    let waitingSince: number | null = null;
    for (const m of [...list].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      const t = new Date(m.created_at).getTime();
      if (m.sender === "cliente" && waitingSince === null) waitingSince = t;
      else if (m.sender === "corretor" && waitingSince !== null) {
        if (t >= p.from && t < p.to) times.push(t - waitingSince);
        waitingSince = null;
      }
    }
  }
  return times.length ? times.reduce((s, x) => s + x, 0) / times.length : null;
}

/** Contagem por dia do período (para o gráfico de leads por dia). */
export function perDay(dates: string[], p: Period): { day: string; count: number }[] {
  const days: { day: string; count: number }[] = [];
  for (let t = p.from; t < p.to; t += DAY) days.push({ day: localDay(t), count: 0 });
  const index = new Map(days.map((d, i) => [d.day, i]));
  for (const iso of dates) {
    const i = index.get(localDay(new Date(iso).getTime()));
    if (i !== undefined && inPeriod(iso, p)) days[i].count++;
  }
  return days;
}

export function perHour(dates: string[]): number[] {
  const out = Array.from({ length: 24 }, () => 0);
  for (const iso of dates) out[localHour(iso)]++;
  return out;
}

/** Etapas do funil na ordem; "Proposta" junta proposta e negociação. */
export const FUNNEL: { key: string; label: string; stages: LeadStage[] }[] = [
  { key: "novo", label: "Novo", stages: ["novo"] },
  { key: "em_atendimento", label: "Em atendimento", stages: ["em_atendimento"] },
  { key: "qualificado", label: "Qualificado", stages: ["qualificado"] },
  { key: "visita_agendada", label: "Visita", stages: ["visita_agendada"] },
  { key: "proposta", label: "Proposta", stages: ["proposta", "negociacao"] },
  { key: "fechado", label: "Fechado", stages: ["fechado"] },
];
const STEP: Partial<Record<LeadStage, number>> = { novo: 0, em_atendimento: 1, qualificado: 2, visita_agendada: 3, proposta: 4, negociacao: 4, fechado: 5 };

type StageEvent = { lead_id: string; stage: LeadStage; at: string };

/** Quantos leads (do período) chegaram pelo menos até cada etapa, pelo histórico e pela etapa atual. */
export function funnel(leads: { id: string; stage: LeadStage }[], events: StageEvent[]): number[] {
  const furthest = new Map<string, number>();
  const bump = (id: string, s: LeadStage) => {
    const step = STEP[s];
    if (step !== undefined) furthest.set(id, Math.max(furthest.get(id) ?? 0, step));
  };
  const ids = new Set(leads.map((l) => l.id));
  for (const l of leads) {
    furthest.set(l.id, 0);
    bump(l.id, l.stage);
  }
  for (const e of events) if (ids.has(e.lead_id)) bump(e.lead_id, e.stage);
  return FUNNEL.map((_, i) => [...furthest.values()].filter((v) => v >= i).length);
}

/** Tempo médio em cada etapa: da entrada até a próxima mudança, para as saídas que aconteceram no período. */
export function stageDurations(events: StageEvent[], p: Period): { key: string; label: string; avgMs: number; count: number }[] {
  const byLead = new Map<string, StageEvent[]>();
  for (const e of events) byLead.set(e.lead_id, [...(byLead.get(e.lead_id) ?? []), e]);
  const sums = new Map<string, { total: number; count: number }>();
  for (const list of byLead.values()) {
    const sorted = [...list].sort((a, b) => a.at.localeCompare(b.at));
    for (let i = 0; i < sorted.length - 1; i++) {
      const step = FUNNEL.find((f) => f.stages.includes(sorted[i].stage));
      if (!step || step.key === "fechado" || !inPeriod(sorted[i + 1].at, p)) continue;
      const ms = new Date(sorted[i + 1].at).getTime() - new Date(sorted[i].at).getTime();
      const cur = sums.get(step.key) ?? { total: 0, count: 0 };
      sums.set(step.key, { total: cur.total + ms, count: cur.count + 1 });
    }
  }
  return FUNNEL.filter((f) => sums.has(f.key)).map((f) => ({ key: f.key, label: f.label, avgMs: sums.get(f.key)!.total / sums.get(f.key)!.count, count: sums.get(f.key)!.count }));
}

/**
 * Como saiu a primeira mensagem do corretor: aprovada da sugestão da IA, editada, ou escrita do zero.
 * A sugestão usada guarda o texto enviado (final_body); é assim que a mensagem é reconhecida.
 */
export function firstMessageKinds(
  messages: (Msg & { body: string })[],
  suggestions: { lead_id: string; status: string; final_body: string | null }[],
  leadIds: Set<string>,
) {
  const first = new Map<string, string>();
  for (const m of [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at)))
    if (m.sender === "corretor" && leadIds.has(m.lead_id) && !first.has(m.lead_id)) first.set(m.lead_id, m.body);
  const out = { aprovada: 0, editada: 0, zero: 0 };
  for (const [lead, body] of first) {
    const s = suggestions.find((x) => x.lead_id === lead && (x.status === "aprovada" || x.status === "editada") && x.final_body?.trim() === body.trim());
    if (s?.status === "aprovada") out.aprovada++;
    else if (s?.status === "editada") out.editada++;
    else out.zero++;
  }
  return out;
}

/** Variação contra o período anterior, já com o sentido (melhor ou pior) para a cor. */
export type Delta = { text: string; good: boolean | null } | null;
export function deltaCount(cur: number, prev: number): Delta {
  if (cur === prev) return { text: "igual", good: null };
  if (prev === 0) return { text: `+${cur}`, good: true };
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { text: `${pct > 0 ? "+" : ""}${pct}%`, good: cur > prev };
}
export function deltaPoints(cur: number | null, prev: number | null): Delta {
  if (cur === null || prev === null) return null;
  const pp = Math.round((cur - prev) * 1000) / 10;
  if (pp === 0) return { text: "igual", good: null };
  return { text: `${pp > 0 ? "+" : ""}${String(pp).replace(".", ",")} p.p.`, good: pp > 0 };
}
/** Para tempos: menos é melhor. */
export function deltaTime(cur: number | null, prev: number | null, fmt: (ms: number) => string): Delta {
  if (cur === null || prev === null) return null;
  const diff = cur - prev;
  if (Math.abs(diff) < 60_000) return { text: "igual", good: null };
  return { text: diff < 0 ? `${fmt(-diff)} mais rápido` : `${fmt(diff)} mais lento`, good: diff < 0 };
}

export const pct = (v: number | null) => (v === null ? "—" : `${String(Math.round(v * 1000) / 10).replace(".", ",")}%`);
