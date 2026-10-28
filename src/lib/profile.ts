import type { Database } from "@/lib/supabase/database.types";
import { formatBRL } from "@/lib/format";

/**
 * Perfil do cliente montado na conversa (C-04) e editado em C-05.
 * O mesmo formato é o retrato que a imobiliária recebe (leads.profile_snapshot), sem endereços.
 */
type Enums = Database["public"]["Enums"];
export type ClientPurpose = Enums["client_purpose"];
export type ClientGoal = Enums["client_goal"];
export type ClientPropertyKind = Enums["client_property_kind"];
export type ClientLifestyle = Enums["client_lifestyle"];
export type ClientPets = Enums["client_pets"];
export type ClientTimeline = Enums["client_timeline"];

export const PRIORITIES = ["perto_trabalho", "servicos_a_pe", "praia", "lazer_no_predio"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type Profile = {
  name: string | null;
  purpose: ClientPurpose | null;
  goal: ClientGoal | null;
  budget_min: number | null;
  budget_max: number | null;
  property_kind: ClientPropertyKind | null;
  bedrooms_min: number | null;
  parking_min: number | null;
  priorities: Priority[];
  work_neighborhood: string | null;
  works_from_home: boolean | null;
  commute_max_min: number | null;
  lifestyle: ClientLifestyle | null;
  has_children: boolean | null;
  pets: ClientPets | null;
  timeline: ClientTimeline | null;
  neighborhoods: string[];
  extras: string[];
};

export type ProfileUpdate = Partial<Omit<Profile, "name">>;

export const EMPTY_PROFILE: Profile = {
  name: null,
  purpose: null,
  goal: null,
  budget_min: null,
  budget_max: null,
  property_kind: null,
  bedrooms_min: null,
  parking_min: null,
  priorities: [],
  work_neighborhood: null,
  works_from_home: null,
  commute_max_min: null,
  lifestyle: null,
  has_children: null,
  pets: null,
  timeline: null,
  neighborhoods: [],
  extras: [],
};

/** Lê um perfil vindo do banco (linha ou retrato JSON), tolerando campos ausentes. */
export function toProfile(row: Record<string, unknown> | null | undefined): Profile {
  if (!row) return { ...EMPTY_PROFILE };
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  return {
    name: (row.name as string) ?? null,
    purpose: (row.purpose as ClientPurpose) ?? null,
    goal: (row.goal as ClientGoal) ?? null,
    budget_min: num(row.budget_min),
    budget_max: num(row.budget_max),
    property_kind: (row.property_kind as ClientPropertyKind) ?? null,
    bedrooms_min: num(row.bedrooms_min),
    parking_min: num(row.parking_min),
    priorities: arr(row.priorities).filter((p): p is Priority => (PRIORITIES as readonly string[]).includes(p)),
    work_neighborhood: (row.work_neighborhood as string) ?? null,
    works_from_home: (row.works_from_home as boolean) ?? null,
    commute_max_min: num(row.commute_max_min),
    lifestyle: (row.lifestyle as ClientLifestyle) ?? null,
    has_children: (row.has_children as boolean) ?? null,
    pets: (row.pets as ClientPets) ?? null,
    timeline: (row.timeline as ClientTimeline) ?? null,
    neighborhoods: arr(row.neighborhoods),
    extras: arr(row.extras),
  };
}

// ---------------------------------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------------------------------
export const PRIORITY_LABELS: Record<Priority, string> = {
  perto_trabalho: "Morar perto do trabalho",
  servicos_a_pe: "Restaurantes e serviços a pé",
  praia: "Perto da praia",
  lazer_no_predio: "Espaço e lazer no prédio",
};
export const LIFESTYLE_LABELS: Record<ClientLifestyle, string> = {
  tranquilidade: "Tranquilidade",
  meio_termo: "Meio-termo",
  movimento: "Movimento",
};
export const PETS_LABELS_CLIENT: Record<ClientPets, string> = {
  nenhum: "Sem pets",
  pequeno: "Pet pequeno",
  grande: "Pet grande",
};
export const TIMELINE_LABELS: Record<ClientTimeline, string> = {
  ate_3_meses: "Próximos 3 meses",
  ate_6_meses: "Em até 6 meses",
  pesquisando: "Só pesquisando",
};
export const KIND_LABELS: Record<ClientPropertyKind, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  tanto_faz: "Tanto faz",
};

export function objectiveLabel(p: Pick<Profile, "purpose" | "goal">): string | null {
  if (p.purpose === "alugar") return "Alugar para morar";
  if (p.purpose === "comprar") {
    if (p.goal === "investir") return "Comprar para investir";
    if (p.goal === "ambos") return "Comprar para morar e investir";
    return "Comprar para morar";
  }
  return null;
}

/** Faixa de valor em texto curto ("Até R$ 900 mil", "R$ 3 mil a R$ 4 mil por mês"). */
export function budgetLabel(p: Pick<Profile, "budget_min" | "budget_max" | "purpose">): string | null {
  const suffix = p.purpose === "alugar" ? " por mês" : "";
  if (p.budget_max && p.budget_min) return `${shortBRL(p.budget_min)} a ${shortBRL(p.budget_max)}${suffix}`;
  if (p.budget_max) return `Até ${shortBRL(p.budget_max)}${suffix}`;
  if (p.budget_min) return `A partir de ${shortBRL(p.budget_min)}${suffix}`;
  return null;
}

/** "R$ 900 mil", "R$ 1,2 mi", "R$ 3.500". */
export function shortBRL(value: number): string {
  if (value >= 1_000_000) {
    const mi = Math.round(value / 100_000) / 10;
    return `R$ ${String(mi).replace(".", ",")} mi`;
  }
  if (value >= 100_000) return `R$ ${Math.round(value / 1000)} mil`;
  return formatBRL(value)!;
}

export function familyLabel(p: Pick<Profile, "has_children" | "pets">): string | null {
  if (p.has_children === null && p.pets === null) return null;
  const kids = p.has_children === null ? null : p.has_children ? "Com filhos" : "Sem filhos";
  const pets = p.pets === null ? null : p.pets === "nenhum" ? "sem pets" : p.pets === "grande" ? "pet grande" : "pet pequeno";
  return [kids, pets].filter(Boolean).join(" · ") || null;
}

export function workLabel(p: Pick<Profile, "work_neighborhood" | "works_from_home">): string | null {
  if (p.works_from_home) return "Trabalha de casa";
  return p.work_neighborhood;
}

// ---------------------------------------------------------------------------------------------------
// Roteiro da conversa (fluxo F2). Ordem do documento; os chips da faixa "Seu perfil" são 9.
// ---------------------------------------------------------------------------------------------------
export type ChipKey =
  | "prioridade"
  | "trabalho"
  | "trajeto"
  | "estilo"
  | "familia"
  | "objetivo"
  | "prazo"
  | "orcamento"
  | "tipo";

export const CHIPS: { key: ChipKey; label: string }[] = [
  { key: "prioridade", label: "Prioridade" },
  { key: "trabalho", label: "Trabalho" },
  { key: "trajeto", label: "Trajeto" },
  { key: "estilo", label: "Estilo de vida" },
  { key: "familia", label: "Filhos e pets" },
  { key: "objetivo", label: "Objetivo" },
  { key: "prazo", label: "Prazo" },
  { key: "orcamento", label: "Orçamento" },
  { key: "tipo", label: "Tipo" },
];

export function chipValue(key: ChipKey, p: Profile): string | null {
  switch (key) {
    case "prioridade":
      return p.priorities.length ? p.priorities.map((x) => PRIORITY_LABELS[x]).join(", ") : null;
    case "trabalho":
      return workLabel(p);
    case "trajeto":
      if (p.works_from_home) return "Não se aplica";
      return p.commute_max_min ? `Até ${p.commute_max_min} min no pico` : null;
    case "estilo":
      return p.lifestyle ? LIFESTYLE_LABELS[p.lifestyle] : null;
    case "familia":
      return p.has_children !== null && p.pets !== null ? familyLabel(p) : null;
    case "objetivo":
      return objectiveLabel(p);
    case "prazo":
      return p.timeline ? TIMELINE_LABELS[p.timeline] : null;
    case "orcamento":
      return budgetLabel(p);
    case "tipo":
      return p.property_kind ? KIND_LABELS[p.property_kind] : null;
  }
}

export type StepKey = Exclude<ChipKey, "familia"> | "filhos" | "pets";

export type Step = {
  key: StepKey;
  chip: ChipKey;
  question: (p: Profile) => string;
  /** Respostas rápidas: rótulo do botão → mudança no perfil. */
  options: (p: Profile) => { label: string; update: ProfileUpdate }[];
  filled: (p: Profile) => boolean;
  /** Passo que não se aplica a este perfil (ex.: trajeto para quem trabalha de casa). */
  skip?: (p: Profile) => boolean;
};

const BUY_BUDGETS = [
  { label: "Até R$ 500 mil", update: { budget_min: null, budget_max: 500_000 } },
  { label: "Até R$ 800 mil", update: { budget_min: null, budget_max: 800_000 } },
  { label: "Até R$ 1,2 mi", update: { budget_min: null, budget_max: 1_200_000 } },
  { label: "Mais de R$ 1,2 mi", update: { budget_min: 1_200_000, budget_max: null } },
];
const RENT_BUDGETS = [
  { label: "Até R$ 2 mil", update: { budget_min: null, budget_max: 2_000 } },
  { label: "Até R$ 3,5 mil", update: { budget_min: null, budget_max: 3_500 } },
  { label: "Até R$ 5 mil", update: { budget_min: null, budget_max: 5_000 } },
  { label: "Mais de R$ 5 mil", update: { budget_min: 5_000, budget_max: null } },
];

export const STEPS: Step[] = [
  {
    key: "prioridade",
    chip: "prioridade",
    question: () => "O que é mais importante no lugar onde você vai morar?",
    options: () => [
      { label: "Morar perto do trabalho", update: { priorities: ["perto_trabalho"] } },
      { label: "Restaurantes e serviços a pé", update: { priorities: ["servicos_a_pe"] } },
      { label: "Ficar perto da praia", update: { priorities: ["praia"] } },
      { label: "Espaço e lazer no prédio", update: { priorities: ["lazer_no_predio"] } },
    ],
    filled: (p) => p.priorities.length > 0,
  },
  {
    key: "trabalho",
    chip: "trabalho",
    question: () => "Em que bairro você trabalha? Se trabalha de casa, é só tocar abaixo.",
    options: () => [
      { label: "Aldeota", update: { work_neighborhood: "Aldeota", works_from_home: false } },
      { label: "Centro", update: { work_neighborhood: "Centro", works_from_home: false } },
      { label: "Meireles", update: { work_neighborhood: "Meireles", works_from_home: false } },
      { label: "Trabalho de casa", update: { work_neighborhood: null, works_from_home: true } },
    ],
    filled: (p) => p.works_from_home === true || !!p.work_neighborhood,
  },
  {
    key: "trajeto",
    chip: "trajeto",
    question: () => "Quanto tempo de trajeto até o trabalho você aceita no horário de pico?",
    options: () =>
      [15, 20, 30, 45].map((m) => ({ label: `Até ${m} min`, update: { commute_max_min: m } })),
    filled: (p) => p.commute_max_min !== null,
    skip: (p) => p.works_from_home === true,
  },
  {
    key: "estilo",
    chip: "estilo",
    question: () => "Você prefere um lugar mais tranquilo ou com movimento?",
    options: () =>
      (["tranquilidade", "meio_termo", "movimento"] as const).map((x) => ({
        label: LIFESTYLE_LABELS[x],
        update: { lifestyle: x },
      })),
    filled: (p) => p.lifestyle !== null,
  },
  {
    key: "filhos",
    chip: "familia",
    question: () => "Vai morar com crianças?",
    options: () => [
      { label: "Sim", update: { has_children: true } },
      { label: "Não", update: { has_children: false } },
    ],
    filled: (p) => p.has_children !== null,
  },
  {
    key: "pets",
    chip: "familia",
    question: () => "E pets? Algum vai junto?",
    options: () =>
      (["nenhum", "pequeno", "grande"] as const).map((x) => ({ label: PETS_LABELS_CLIENT[x], update: { pets: x } })),
    filled: (p) => p.pets !== null,
  },
  {
    key: "objetivo",
    chip: "objetivo",
    question: () => "Você quer comprar ou alugar? E é para morar ou investir?",
    options: () => [
      { label: "Comprar para morar", update: { purpose: "comprar", goal: "morar" } },
      { label: "Comprar para investir", update: { purpose: "comprar", goal: "investir" } },
      { label: "Morar e investir", update: { purpose: "comprar", goal: "ambos" } },
      { label: "Alugar para morar", update: { purpose: "alugar", goal: "morar" } },
    ],
    filled: (p) => p.purpose !== null,
  },
  {
    key: "prazo",
    chip: "prazo",
    question: () => "Para quando é a mudança?",
    options: () =>
      (["ate_3_meses", "ate_6_meses", "pesquisando"] as const).map((x) => ({
        label: x === "ate_3_meses" ? "Nos próximos 3 meses" : TIMELINE_LABELS[x],
        update: { timeline: x },
      })),
    filled: (p) => p.timeline !== null,
  },
  {
    key: "orcamento",
    chip: "orcamento",
    question: (p) =>
      p.purpose === "alugar"
        ? "Quanto você pode pagar de aluguel por mês?"
        : "Qual é a faixa de valor do imóvel?",
    options: (p) => (p.purpose === "alugar" ? RENT_BUDGETS : BUY_BUDGETS),
    filled: (p) => p.budget_max !== null || p.budget_min !== null,
  },
  {
    key: "tipo",
    chip: "tipo",
    question: () => "Apartamento ou casa?",
    options: () =>
      (["apartamento", "casa", "tanto_faz"] as const).map((x) => ({ label: KIND_LABELS[x], update: { property_kind: x } })),
    filled: (p) => p.property_kind !== null,
  },
];

/** Próxima pergunta do roteiro que ainda falta, ou null quando todas foram respondidas. */
export function nextStep(p: Profile): Step | null {
  return STEPS.find((s) => !s.filled(p) && !s.skip?.(p)) ?? null;
}

export function stepByKey(key: string | null | undefined): Step | null {
  return STEPS.find((s) => s.key === key) ?? null;
}

/** Chips preenchidos (faixa "Seu perfil": "5 de 9"). */
export function filledChips(p: Profile): number {
  return CHIPS.filter((c) => chipValue(c.key, p) !== null).length;
}

/**
 * Perfil mínimo para recomendar (fluxo F2, passo 5): orçamento, tipo e bairros ou rotina.
 * Sem compra ou aluguel não dá para filtrar os anúncios, então também entra.
 */
export function isMinimumProfile(p: Profile): boolean {
  return (
    p.purpose !== null &&
    (p.budget_max !== null || p.budget_min !== null) &&
    p.property_kind !== null &&
    (p.neighborhoods.length > 0 || !!p.work_neighborhood || p.works_from_home === true)
  );
}

/** Aplica uma mudança validada ao perfil (sem mutar o original). */
export function applyUpdate(p: Profile, u: ProfileUpdate): Profile {
  const next = { ...p, ...u };
  if (next.budget_min !== null && next.budget_max !== null && next.budget_min > next.budget_max) {
    next.budget_min = null;
  }
  return next;
}

/** Diferença entre dois perfis, só com os campos que mudaram (para gravar no banco). */
export function diffProfile(before: Profile, after: Profile): ProfileUpdate {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(after) as (keyof Profile)[]) {
    if (key === "name") continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) out[key] = after[key];
  }
  return out as ProfileUpdate;
}

/** Frase do que mudou, para a IA confirmar ("Anotado: orçamento até R$ 1 mi."). */
export function describeUpdate(u: ProfileUpdate, p: Profile): string[] {
  const parts: string[] = [];
  if (u.priorities) parts.push(`prioridade ${u.priorities.map((x) => PRIORITY_LABELS[x].toLowerCase()).join(" e ")}`);
  if (u.works_from_home) parts.push("trabalha de casa");
  else if (u.work_neighborhood) parts.push(`trabalho em ${u.work_neighborhood}`);
  if (u.commute_max_min) parts.push(`até ${u.commute_max_min} min de trajeto`);
  if (u.lifestyle) parts.push(LIFESTYLE_LABELS[u.lifestyle].toLowerCase());
  if (u.has_children !== undefined && u.has_children !== null) parts.push(u.has_children ? "com crianças" : "sem crianças");
  if (u.pets) parts.push(PETS_LABELS_CLIENT[u.pets].toLowerCase());
  if (u.purpose) parts.push(objectiveLabel({ purpose: u.purpose, goal: u.goal ?? p.goal })!.toLowerCase());
  if (u.timeline) parts.push(TIMELINE_LABELS[u.timeline].toLowerCase());
  if (u.budget_max !== undefined || u.budget_min !== undefined) {
    const b = budgetLabel(p);
    if (b) parts.push(`orçamento ${b.charAt(0).toLowerCase()}${b.slice(1)}`);
  }
  if (u.property_kind) parts.push(KIND_LABELS[u.property_kind].toLowerCase());
  if (u.bedrooms_min) parts.push(`${u.bedrooms_min}+ quartos`);
  if (u.parking_min) parts.push(`${u.parking_min}+ vagas`);
  if (u.neighborhoods?.length) parts.push(`bairros: ${u.neighborhoods.join(", ")}`);
  if (u.extras?.length) parts.push(u.extras.join(", ").toLowerCase());
  return parts;
}
