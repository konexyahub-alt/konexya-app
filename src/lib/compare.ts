import { formatBRL } from "@/lib/format";
import { shortBRL, type Profile } from "@/lib/profile";
import { criteria, scoreProperty, type Criterion, type ScoredProperty, type Weights } from "@/lib/scoring";
import type { ScoreBand } from "@/lib/score-band";

/**
 * Comparação de imóveis (C-08, docs/DECISOES.md). A tabela é moldada pelo perfil: critério que o cliente não
 * mencionou vai para "Ver todos os detalhes". A análise é feita por código, só com dados dos anúncios e do
 * perfil (regra 8); a nota continua a do app (regra 7). A análise escrita pela IA entra quando houver créditos.
 */
export type CompareProperty = ScoredProperty & {
  title: string | null;
  area_m2: number | null;
  condo_fee: number | null;
  iptu_monthly: number | null;
};
export type Cell = { text: string; tone: ScoreBand | null; best: boolean };
export type Row = { key: string; label: string; cells: Cell[] };

const LEISURE = ["Piscina", "Academia", "Salão de festas", "Playground", "Quadra", "Churrasqueira", "Espaço gourmet"];
const PETS_TEXT = { qualquer: "Qualquer porte", pequeno: "Só pequeno", nao: "Não aceita" } as const;

const num = (v: number | string | null) => (v === null ? null : Number(v));
const leisureOf = (p: CompareProperty) => p.amenities.filter((a) => LEISURE.includes(a));

/** O que o cliente contou que entra na comparação. */
export function mentioned(profile: Profile) {
  const worksOut = !profile.works_from_home && !!profile.work_neighborhood;
  return {
    budget: profile.budget_max !== null || profile.budget_min !== null,
    bedrooms: (profile.bedrooms_min ?? 0) > 0,
    parking: (profile.parking_min ?? 0) > 0,
    pets: profile.pets === "grande" || profile.pets === "pequeno",
    location: profile.neighborhoods.length > 0 || (worksOut && profile.priorities.includes("perto_trabalho")),
    leisure: profile.priorities.includes("lazer_no_predio"),
  };
}

/** Marca o melhor valor (menor ou maior) quando há diferença entre os imóveis. */
function best(values: (number | null)[], prefer: "min" | "max"): boolean[] {
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2 || new Set(known).size < 2) return values.map(() => false);
  const target = prefer === "min" ? Math.min(...known) : Math.max(...known);
  return values.map((v) => v === target);
}

export function compareRows(props: CompareProperty[], profile: Profile): { main: Row[]; details: Row[] } {
  const m = mentioned(profile);
  const bands = props.map((p) => Object.fromEntries(criteria(p, profile).map((c) => [c.criterion, c.reason.band])) as Partial<Record<Criterion, ScoreBand>>);
  const tone = (i: number, c: Criterion) => bands[i][c] ?? null;
  const row = (key: string, label: string, texts: string[], flags: boolean[], criterion?: Criterion): Row => ({
    key,
    label,
    cells: texts.map((text, i) => ({ text, tone: criterion ? tone(i, criterion) : null, best: flags[i] })),
  });

  const prices = props.map((p) => num(p.price));
  const condo = props.map((p) => num(p.condo_fee));
  const area = props.map((p) => num(p.area_m2));
  const beds = props.map((p) => p.bedrooms);
  const parking = props.map((p) => p.parking_spots);
  const leisure = props.map(leisureOf);
  const petRank = (p: CompareProperty) => (p.pets === "qualquer" ? 2 : p.pets === "pequeno" ? 1 : p.pets === "nao" ? 0 : null);

  const rows = {
    preco: row(
      "preco",
      props.every((p) => p.purpose === "aluguel") ? "Aluguel" : "Preço",
      prices.map((v) => (v === null ? "Não informado" : shortBRL(v))),
      best(prices, "min"),
      m.budget ? "orcamento" : undefined,
    ),
    condominio: row("condominio", "Condomínio", condo.map((v) => formatBRL(v) ?? "Não informado"), best(condo, "min")),
    area: row("area", "Área", area.map((v) => (v === null ? "Não informada" : `${v} m²`)), best(area, "max")),
    quartos: row("quartos", "Quartos", beds.map((v) => (v === null ? "Não informado" : String(v))), best(beds, "max"), m.bedrooms ? "quartos" : undefined),
    vagas: row("vagas", "Vagas", parking.map((v) => (v === null ? "Não informado" : String(v))), best(parking, "max"), m.parking ? "vagas" : undefined),
    pets: row(
      "pets",
      "Pets",
      props.map((p) => (p.pets ? PETS_TEXT[p.pets] : "Não informado")),
      best(props.map(petRank), "max"),
      m.pets ? "pets" : undefined,
    ),
    lazer: row(
      "lazer",
      "Lazer",
      leisure.map((l) => (l.length ? l.slice(0, 3).join(", ") : "—")),
      best(leisure.map((l) => l.length), "max"),
      m.leisure ? "lazer" : undefined,
    ),
    bairro: row("bairro", "Bairro", props.map((p) => p.neighborhood ?? "Não informado"), props.map(() => false), m.location ? "localizacao" : undefined),
    iptu: row("iptu", "IPTU por mês", props.map((p) => formatBRL(num(p.iptu_monthly)) ?? "Não informado"), best(props.map((p) => num(p.iptu_monthly)), "min")),
  };

  const main = [rows.preco, rows.condominio, rows.area];
  const details: Row[] = [];
  (m.location ? main : details).push(rows.bairro);
  (m.bedrooms ? main : details).push(rows.quartos);
  (m.parking ? main : details).push(rows.vagas);
  (m.pets ? main : details).push(rows.pets);
  (m.leisure ? main : details).push(rows.lazer);
  details.push(rows.iptu);
  return { main, details };
}

export type Analysis = {
  /** Imóvel que mais combina e o porquê. Null quando o perfil não tem critério para comparar. */
  headline: { id: string; title: string; text: string } | null;
  others: { id: string; title: string; text: string }[];
  /** Convite para completar o perfil quando ele tem pouca informação. */
  invite: string | null;
};

const lower = (s: string) => s[0].toLowerCase() + s.slice(1);
function joinPt(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`;
}
const titleOf = (p: CompareProperty) => p.title ?? "Imóvel";

export function compareAnalysis(props: CompareProperty[], profile: Profile, weights?: Weights): Analysis {
  const m = mentioned(profile);
  const missing = [
    !m.pets && profile.pets === null ? "se você tem pet" : null,
    !m.parking ? "se precisa de vaga" : null,
    !m.bedrooms ? "quantos quartos precisa" : null,
    !m.location ? "os bairros que prefere" : null,
  ].filter((x): x is string => !!x);
  const count = Object.values(m).filter(Boolean).length + (profile.property_kind === "apartamento" || profile.property_kind === "casa" ? 1 : 0);
  const invite = count < 3 && missing.length ? `Me conte ${missing.slice(0, 2).join(" ou ")} para eu comparar melhor.` : null;

  const scored = props.map((p) => ({ p, s: scoreProperty(p, profile, weights), parts: criteria(p, profile) }));
  if (scored.every((x) => !x.s)) {
    return { headline: null, others: [], invite: "Me conte o seu orçamento, quantos quartos precisa e se tem pet para eu comparar estes imóveis." };
  }
  const ranked = [...scored].sort((a, b) => (b.s?.score ?? -1) - (a.s?.score ?? -1) || (num(a.p.price) ?? Infinity) - (num(b.p.price) ?? Infinity));
  const top = ranked[0];
  const good = top.s!.reasons.filter((r) => r.band === "ok").slice(0, 3).map((r) => lower(r.text));
  const bad = top.s!.reasons.filter((r) => r.band !== "ok").map((r) => lower(r.text));
  const headline = {
    id: top.p.id,
    title: titleOf(top.p),
    text:
      `é o que mais combina com você (${top.s!.score}%)` +
      (good.length ? `: ${joinPt(good)}.` : ".") +
      (bad.length ? ` Atenção: ${joinPt(bad)}.` : ""),
  };

  const topValue = Object.fromEntries(top.parts.map((x) => [x.criterion, x.value]));
  const others = ranked.slice(1).map(({ p, s, parts }) => {
    const bits: string[] = [];
    const a = num(p.price);
    const b = num(top.p.price);
    if (a !== null && b !== null && a !== b) bits.push(`custa ${shortBRL(Math.abs(a - b))} ${a > b ? "a mais" : "a menos"}`);
    const pros = parts.filter((x) => x.value > (topValue[x.criterion] ?? 100)).map((x) => lower(x.reason.text));
    if (pros.length) bits.push(`melhor em: ${joinPt(pros)}`);
    const cons = (s?.reasons ?? []).filter((r) => r.band !== "ok").map((r) => lower(r.text));
    if (cons.length) bits.push(`atenção: ${joinPt(cons)}`);
    const text = bits.length ? `${bits.join("; ")}.` : "atende aos mesmos critérios do seu perfil.";
    return { id: p.id, title: titleOf(p), text: (s ? `${s.score}% · ` : "") + text };
  });
  return { headline, others, invite };
}
