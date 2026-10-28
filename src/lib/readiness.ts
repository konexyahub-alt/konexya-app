import type { Qualification } from "@/lib/assistant";
import type { Profile } from "@/lib/profile";

/**
 * Nota de prontidão do lead (I4): curioso, pesquisando ou pronto para visitar.
 * Regra objetiva, a partir do prazo e do orçamento informados pelo próprio cliente:
 *   - pronto para visitar: muda nos próximos 3 meses e informou o orçamento;
 *   - pesquisando: muda em até 6 meses, ou em 3 meses sem orçamento;
 *   - curioso: só pesquisando ou sem prazo.
 */
export type Readiness = "curioso" | "pesquisando" | "pronto_para_visitar";

export const READINESS_LABELS: Record<Readiness, string> = {
  curioso: "Curioso",
  pesquisando: "Pesquisando",
  pronto_para_visitar: "Pronto para visitar",
};

export function readiness(p: Profile): Readiness {
  const hasBudget = p.budget_max !== null || p.budget_min !== null;
  if (p.timeline === "ate_3_meses") return hasBudget ? "pronto_para_visitar" : "pesquisando";
  if (p.timeline === "ate_6_meses") return "pesquisando";
  return "curioso";
}

export type QualificationItem = { label: string; value: string | null; source?: "agora" };

/** Itens da Qualificação no lead aberto: ok quando informado, "a confirmar" quando não. */
export function qualificationItems(p: Profile, q: Qualification, consentAt: string | null): QualificationItem[] {
  const budget = p.budget_max !== null || p.budget_min !== null;
  return [
    { label: "Orçamento informado", value: budget ? "Sim" : null },
    { label: "Necessidade clara", value: p.property_kind && p.purpose ? "Sim" : null },
    { label: "Prazo", value: p.timeline ? { ate_3_meses: "Até 3 meses", ate_6_meses: "Até 6 meses", pesquisando: "Pesquisando" }[p.timeline] : null },
    { label: "Consentimento LGPD", value: consentAt ? "Autorizado" : null },
    { label: "Pagamento", value: q.pagamento?.value ?? null },
    { label: "Crédito aprovado", value: q.credito?.value ?? null },
    { label: "FGTS", value: q.fgts?.value ?? null },
    { label: "Vender outro imóvel", value: q.vender_imovel?.value ?? null },
    { label: "Melhor horário", value: q.horario?.value ?? null },
  ];
}
