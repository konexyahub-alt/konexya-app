import { sameNeighborhood } from "@/lib/neighborhoods";
import type { Profile } from "@/lib/profile";
import { scoreBand, type ScoreBand } from "@/lib/score-band";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Nota de compatibilidade (regra 7): código determinístico, pesos configuráveis, motivos por critério.
 * Nunca usa o LLM e nunca inventa dado: critério sem informação no perfil fica fora da conta; critério sem
 * informação no anúncio entra com nota neutra e um aviso dizendo que o anúncio não informa.
 *
 * Fica fora (por enquanto): trajeto até o trabalho e serviços por perto dependem de rotas e pontos de
 * interesse reais, que entram com o Mapa Vivo (etapa 3). "Potencial de investimento" não entra.
 */
export const CRITERIA = ["orcamento", "tipo", "quartos", "vagas", "pets", "localizacao", "lazer"] as const;
export type Criterion = (typeof CRITERIA)[number];
export type Weights = Record<Criterion, number>;

export const DEFAULT_WEIGHTS: Weights = {
  orcamento: 30,
  tipo: 15,
  quartos: 15,
  vagas: 10,
  pets: 15,
  localizacao: 15,
  lazer: 10,
};

export const CRITERION_LABELS: Record<Criterion, string> = {
  orcamento: "Orçamento",
  tipo: "Tipo de imóvel",
  quartos: "Quartos",
  vagas: "Vagas",
  pets: "Pets",
  localizacao: "Localização",
  lazer: "Lazer no prédio",
};

/** Pesos vindos do banco, com os padrões para o que faltar ou vier inválido. */
export function readWeights(raw: unknown): Weights {
  const out = { ...DEFAULT_WEIGHTS };
  if (raw && typeof raw === "object") {
    for (const k of CRITERIA) {
      const v = Number((raw as Record<string, unknown>)[k]);
      if (Number.isFinite(v) && v >= 0 && v <= 100) out[k] = v;
    }
  }
  return out;
}

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
export type ScoredProperty = Pick<
  PropertyRow,
  "id" | "purpose" | "type" | "price" | "bedrooms" | "parking_spots" | "pets" | "neighborhood" | "amenities" | "has_seal"
>;

export type Reason = { criterion: Criterion; band: ScoreBand; text: string };
export type ScoreResult = { score: number; band: ScoreBand; reasons: Reason[] };

const LEISURE = ["Piscina", "Academia", "Salão de festas", "Playground", "Quadra", "Churrasqueira", "Espaço gourmet"];
const APARTMENT_TYPES = ["apartamento", "cobertura", "studio"];

/** O imóvel entra nas recomendações? (finalidade e tipo residencial; nota baixa não exclui). */
export function isEligible(p: ScoredProperty, profile: Profile): boolean {
  if (p.type === "terreno" || p.type === "sala_comercial") return false;
  if (profile.purpose === "comprar" && p.purpose !== "venda") return false;
  if (profile.purpose === "alugar" && p.purpose !== "aluguel") return false;
  return true;
}

function part(criterion: Criterion, value: number, text: string) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return { criterion, value: v, reason: { criterion, band: scoreBand(v), text } satisfies Reason };
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/** Critérios que se aplicam a este par perfil × imóvel, cada um com nota de 0 a 100 e o motivo. */
export function criteria(p: ScoredProperty, profile: Profile) {
  const parts: ReturnType<typeof part>[] = [];
  const price = p.price === null ? null : Number(p.price);

  // Orçamento
  if (profile.budget_max !== null || profile.budget_min !== null) {
    if (price === null) parts.push(part("orcamento", 50, "O anúncio não informa o preço"));
    else if (profile.budget_max !== null && price > profile.budget_max) {
      const over = Math.round((price / profile.budget_max - 1) * 100);
      parts.push(part("orcamento", 100 - over * 4, `${Math.max(over, 1)}% acima do orçamento informado`));
    } else if (profile.budget_min !== null && profile.budget_max === null && price < profile.budget_min * 0.8) {
      parts.push(part("orcamento", 70, `Abaixo da faixa que você indicou (a partir de ${brl(profile.budget_min)})`));
    } else parts.push(part("orcamento", 100, "Dentro do orçamento informado"));
  }

  // Tipo
  if (profile.property_kind === "apartamento" || profile.property_kind === "casa") {
    const isApt = APARTMENT_TYPES.includes(p.type);
    const wantsApt = profile.property_kind === "apartamento";
    if (isApt === wantsApt) parts.push(part("tipo", 100, wantsApt ? "É apartamento, como você procura" : "É casa, como você procura"));
    else parts.push(part("tipo", 40, wantsApt ? "É casa, e você procura apartamento" : "É apartamento, e você procura casa"));
  }

  // Quartos
  if (profile.bedrooms_min !== null && profile.bedrooms_min > 0) {
    if (p.bedrooms === null) parts.push(part("quartos", 50, "O anúncio não informa os quartos"));
    else if (p.bedrooms >= profile.bedrooms_min) parts.push(part("quartos", 100, `${p.bedrooms} quartos, como você precisa`));
    else if (p.bedrooms === profile.bedrooms_min - 1)
      parts.push(part("quartos", 60, `${p.bedrooms} ${p.bedrooms === 1 ? "quarto" : "quartos"}, um a menos do que você pediu`));
    else parts.push(part("quartos", 20, `${p.bedrooms} ${p.bedrooms === 1 ? "quarto" : "quartos"}, abaixo do que você pediu`));
  }

  // Vagas
  if (profile.parking_min !== null && profile.parking_min > 0) {
    if (p.parking_spots === null) parts.push(part("vagas", 50, "O anúncio não informa as vagas"));
    else if (p.parking_spots >= profile.parking_min)
      parts.push(part("vagas", 100, `${p.parking_spots} ${p.parking_spots === 1 ? "vaga" : "vagas"} de garagem`));
    else parts.push(part("vagas", 30, `${p.parking_spots === 0 ? "Sem vaga" : `Só ${p.parking_spots} vaga`} de garagem`));
  }

  // Pets
  if (profile.pets === "grande" || profile.pets === "pequeno") {
    if (p.pets === null) parts.push(part("pets", 50, "O anúncio não informa se aceita pets"));
    else if (p.pets === "nao") parts.push(part("pets", 0, "Não aceita pets"));
    else if (profile.pets === "grande" && p.pets === "pequeno")
      parts.push(part("pets", 20, "Condomínio só aceita pets de porte pequeno"));
    else parts.push(part("pets", 100, profile.pets === "grande" ? "Aceita pets de porte grande" : "Aceita pets"));
  }

  // Localização (bairros escolhidos ou bairro do trabalho; distância real entra com o Mapa Vivo)
  const inChosen = profile.neighborhoods.some((n) => sameNeighborhood(n, p.neighborhood));
  if (inChosen) parts.push(part("localizacao", 100, `No ${p.neighborhood}, um dos bairros que você procura`));
  else if (!profile.works_from_home && sameNeighborhood(profile.work_neighborhood, p.neighborhood))
    parts.push(part("localizacao", 100, "No mesmo bairro do seu trabalho"));
  else if (profile.neighborhoods.length) parts.push(part("localizacao", 40, "Fora dos bairros que você indicou"));

  // Lazer no prédio, se for prioridade
  if (profile.priorities.includes("lazer_no_predio")) {
    const items = p.amenities.filter((a) => LEISURE.includes(a));
    if (items.length >= 2) parts.push(part("lazer", 100, `Lazer no prédio: ${items.slice(0, 3).join(", ").toLowerCase()}`));
    else if (items.length === 1) parts.push(part("lazer", 70, `Lazer no prédio: ${items[0].toLowerCase()}`));
    else parts.push(part("lazer", 40, "O anúncio não lista itens de lazer no prédio"));
  }

  return parts;
}

/** Nota geral (média ponderada dos critérios que se aplicam). Sem critério nenhum, não há nota. */
export function scoreProperty(p: ScoredProperty, profile: Profile, weights: Weights = DEFAULT_WEIGHTS): ScoreResult | null {
  const parts = criteria(p, profile).filter((x) => weights[x.criterion] > 0);
  if (!parts.length) return null;
  const total = parts.reduce((s, x) => s + weights[x.criterion], 0);
  const score = Math.round(parts.reduce((s, x) => s + x.value * weights[x.criterion], 0) / total);
  const reasons = parts.map((x) => x.reason).sort((a, b) => bandOrder(a.band) - bandOrder(b.band));
  return { score, band: scoreBand(score), reasons };
}

function bandOrder(b: ScoreBand) {
  return b === "ok" ? 0 : b === "warn" ? 1 : 2;
}

export type Ranked<T extends ScoredProperty> = { property: T } & ScoreResult;

/**
 * Ordena as recomendações. O selo "Anúncio completo" soma um bônus pequeno só na ordenação (regra 9):
 * nunca muda a nota mostrada e não passa um anúncio à frente de outro muito mais compatível.
 */
export function rankProperties<T extends ScoredProperty>(
  properties: T[],
  profile: Profile,
  weights: Weights = DEFAULT_WEIGHTS,
  sealBonus = 2,
): Ranked<T>[] {
  const out: Ranked<T>[] = [];
  for (const property of properties) {
    if (!isEligible(property, profile)) continue;
    const result = scoreProperty(property, profile, weights);
    if (result) out.push({ property, ...result });
  }
  const key = (r: Ranked<T>) => r.score + (r.property.has_seal ? sealBonus : 0);
  return out.sort((a, b) => key(b) - key(a) || Number(a.property.price ?? Infinity) - Number(b.property.price ?? Infinity));
}
