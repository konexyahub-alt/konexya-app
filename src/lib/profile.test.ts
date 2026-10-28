import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE,
  STEPS,
  applyUpdate,
  budgetLabel,
  diffProfile,
  filledChips,
  isMinimumProfile,
  nextStep,
  shortBRL,
  toProfile,
} from "./profile";

describe("roteiro da conversa (F2)", () => {
  it("segue a ordem do documento, uma pergunta por vez", () => {
    expect(STEPS.map((s) => s.key)).toEqual([
      "prioridade", "trabalho", "trajeto", "estilo", "filhos", "pets", "objetivo", "prazo", "orcamento", "tipo",
    ]);
    expect(nextStep(EMPTY_PROFILE)?.key).toBe("prioridade");
  });

  it("toda pergunta tem respostas rápidas", () => {
    for (const s of STEPS) expect(s.options(EMPTY_PROFILE).length).toBeGreaterThan(1);
  });

  it("pula o trajeto para quem trabalha de casa", () => {
    const p = applyUpdate(EMPTY_PROFILE, { priorities: ["praia"], works_from_home: true });
    expect(nextStep(p)?.key).toBe("estilo");
  });

  it("orçamento muda de faixa para aluguel", () => {
    const rent = STEPS.find((s) => s.key === "orcamento")!.options({ ...EMPTY_PROFILE, purpose: "alugar" });
    expect(rent[0].label).toBe("Até R$ 2 mil");
  });

  it("faixa 'Seu perfil' conta 9 chips", () => {
    let p = EMPTY_PROFILE;
    for (const s of STEPS) p = applyUpdate(p, s.options(p)[0].update);
    expect(filledChips(p)).toBe(9);
    expect(nextStep(p)).toBeNull();
    expect(isMinimumProfile(p)).toBe(true);
  });

  it("perfil mínimo exige finalidade, orçamento, tipo e bairro ou rotina", () => {
    const base = { ...EMPTY_PROFILE, purpose: "comprar" as const, budget_max: 800_000, property_kind: "casa" as const };
    expect(isMinimumProfile(base)).toBe(false);
    expect(isMinimumProfile({ ...base, neighborhoods: ["Cocó"] })).toBe(true);
    expect(isMinimumProfile({ ...base, works_from_home: true })).toBe(true);
  });

  it("diferença só com o que mudou e leitura tolerante do banco", () => {
    const a = toProfile({ name: "Ana", budget_max: "900000.00", priorities: ["praia", "x"] });
    expect(a.budget_max).toBe(900_000);
    expect(a.priorities).toEqual(["praia"]);
    expect(diffProfile(a, applyUpdate(a, { pets: "grande" }))).toEqual({ pets: "grande" });
  });

  it("valores curtos em reais", () => {
    expect(shortBRL(900_000)).toBe("R$ 900 mil");
    expect(shortBRL(1_200_000)).toBe("R$ 1,2 mi");
    expect(budgetLabel({ budget_min: null, budget_max: 3_500, purpose: "alugar" })).toBe("Até R$ 3.500 por mês");
  });
});
