import { findNeighborhoods, normalizeText } from "@/lib/neighborhoods";
import type { ProfileUpdate, StepKey } from "@/lib/profile";

/**
 * Leitura determinística de respostas digitadas para cada pergunta do roteiro. Quando dá para entender
 * sem IA, não gasta IA (custo e limite diário). Quando não dá, devolve null e o servidor pergunta à IA.
 */
export function parseStepAnswer(step: StepKey, text: string): ProfileUpdate | null {
  const t = normalizeText(text);
  if (!t) return null;
  switch (step) {
    case "prioridade": {
      const priorities: NonNullable<ProfileUpdate["priorities"]> = [];
      if (/restaurant|servico|a pe\b|padaria|mercado|comercio|farmacia/.test(t)) priorities.push("servicos_a_pe");
      if (/praia|beira.?mar|mar\b/.test(t)) priorities.push("praia");
      if (/lazer|piscina|academia|playground|area de lazer|clube/.test(t)) priorities.push("lazer_no_predio");
      return priorities.length ? { priorities } : null;
    }
    case "trabalho": {
      if (/\b(de casa|home ?office|remoto|em casa)\b/.test(t)) return { works_from_home: true, work_neighborhood: null };
      const [first] = findNeighborhoods(text);
      return first ? { work_neighborhood: first, works_from_home: false } : null;
    }
    case "trajeto": {
      const minutes = parseMinutes(t);
      return minutes ? { commute_max_min: minutes } : null;
    }
    case "estilo": {
      if (/meio|equilib|tanto faz/.test(t)) return { lifestyle: "meio_termo" };
      if (/tranquil|calm|silenc|sossego|quiet/.test(t)) return { lifestyle: "tranquilidade" };
      if (/moviment|agit|badal|vida noturna|animad/.test(t)) return { lifestyle: "movimento" };
      return null;
    }
    case "filhos": {
      if (/^(nao|n|nenhum|nenhuma|sem)\b|sem filho|sem crianca|nao tenho/.test(t)) return { has_children: false };
      if (/^(sim|s)\b|filh|crianc|bebe/.test(t)) return { has_children: true };
      return null;
    }
    case "pets": {
      if (/^(nao|n|nenhum)\b|sem pet|sem animal|nao tenho/.test(t)) return { pets: "nenhum" };
      if (/grande|labrador|golden|pastor|cao grande|cachorro grande/.test(t)) return { pets: "grande" };
      if (/pequen|gato|gata|yorkshire|shih|pinscher|poodle|calopsita|passaro/.test(t)) return { pets: "pequeno" };
      return null;
    }
    case "objetivo": {
      if (/alug/.test(t)) return { purpose: "alugar", goal: "morar" };
      const invest = /invest|renda|revend/.test(t);
      const live = /morar|moradia|para mim|minha familia/.test(t);
      if (invest && live) return { purpose: "comprar", goal: "ambos" };
      if (invest) return { purpose: "comprar", goal: "investir" };
      if (live || /compr/.test(t)) return { purpose: "comprar", goal: "morar" };
      return null;
    }
    case "prazo": {
      if (/pesquis|sem pressa|so olhando|ainda nao sei|nao tenho pressa/.test(t)) return { timeline: "pesquisando" };
      if (/\b(1|2|3|um|dois|tres) mes|logo|urgente|o quanto antes|imediat|este mes|esse mes/.test(t)) return { timeline: "ate_3_meses" };
      if (/\b(4|5|6|quatro|cinco|seis) mes|semestre/.test(t)) return { timeline: "ate_6_meses" };
      if (/ano/.test(t)) return { timeline: "pesquisando" };
      return null;
    }
    case "orcamento":
      return parseBudget(t);
    case "tipo": {
      if (/tanto faz|qualquer|os dois|ambos/.test(t)) return { property_kind: "tanto_faz" };
      if (/apart|apto|ap\b|cobertura|studio|flat/.test(t)) return { property_kind: "apartamento" };
      if (/casa|sobrado|duplex/.test(t)) return { property_kind: "casa" };
      return null;
    }
  }
}

/** "20 min", "meia hora", "1 hora", "45" → minutos (5 a 180). */
export function parseMinutes(t: string): number | null {
  if (/meia hora/.test(t)) return 30;
  if (/uma hora|1 hora|1h\b/.test(t)) return 60;
  const m = t.match(/(\d{1,3})\s*(min|m\b|minutos)?/);
  if (!m) return null;
  const v = Number(m[1]);
  return v >= 5 && v <= 180 ? v : null;
}

/**
 * Valores em reais escritos de vários jeitos: "900 mil", "1,2 milhão", "R$ 850.000", "4 mil", "3500".
 * Devolve todos os valores encontrados, em ordem.
 */
export function parseMoneyValues(text: string): number[] {
  const t = normalizeText(text);
  const out: number[] = [];
  const re = /(\d{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?)\s*(milhoes|milhao|mi\b|mil\b|k\b)?/g;
  for (const m of t.matchAll(re)) {
    const raw = m[1];
    const unit = m[2];
    let v: number;
    if (/^\d{1,3}([.\s]\d{3})+$/.test(raw)) v = Number(raw.replace(/[.\s]/g, ""));
    else v = Number(raw.replace(",", "."));
    if (!Number.isFinite(v)) continue;
    if (unit === "mil" || unit === "k") v *= 1_000;
    else if (unit) v *= 1_000_000;
    if (v >= 300) out.push(Math.round(v));
  }
  return out;
}

export function parseBudget(text: string): ProfileUpdate | null {
  const t = normalizeText(text);
  const values = parseMoneyValues(t);
  if (!values.length) return null;
  if (values.length >= 2 && /entre|de .* a |a partir|ate/.test(t)) {
    const [a, b] = values;
    return { budget_min: Math.min(a, b), budget_max: Math.max(a, b) };
  }
  const v = values[0];
  if (/mais de|acima de|a partir de|no minimo/.test(t)) return { budget_min: v, budget_max: null };
  return { budget_min: null, budget_max: v };
}
