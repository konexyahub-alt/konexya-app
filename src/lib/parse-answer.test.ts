import { describe, expect, it } from "vitest";
import { parseBudget, parseMoneyValues, parseStepAnswer } from "./parse-answer";
import { findNeighborhoods } from "./neighborhoods";

describe("respostas digitadas sem IA", () => {
  it("reconhece bairros, sem acento e no meio da frase", () => {
    expect(parseStepAnswer("trabalho", "trabalho na aldeota")).toEqual({ work_neighborhood: "Aldeota", works_from_home: false });
    expect(parseStepAnswer("trabalho", "Dionisio Torres")).toEqual({ work_neighborhood: "Dionísio Torres", works_from_home: false });
    expect(parseStepAnswer("trabalho", "faço home office")).toEqual({ works_from_home: true, work_neighborhood: null });
    expect(findNeighborhoods("entre Cocó e Praia de Iracema")).toEqual(["Praia de Iracema", "Cocó"]);
  });

  it("entende valores em reais escritos de vários jeitos", () => {
    expect(parseMoneyValues("até 900 mil")).toEqual([900_000]);
    expect(parseMoneyValues("1,2 milhão")).toEqual([1_200_000]);
    expect(parseMoneyValues("R$ 850.000")).toEqual([850_000]);
    expect(parseBudget("entre 600 mil e 800 mil")).toEqual({ budget_min: 600_000, budget_max: 800_000 });
    expect(parseBudget("acima de 1 milhão")).toEqual({ budget_min: 1_000_000, budget_max: null });
    expect(parseBudget("uns 4 mil por mês")).toEqual({ budget_min: null, budget_max: 4_000 });
  });

  it("entende as demais perguntas do roteiro", () => {
    expect(parseStepAnswer("trajeto", "meia hora")).toEqual({ commute_max_min: 30 });
    expect(parseStepAnswer("trajeto", "uns 25 minutos")).toEqual({ commute_max_min: 25 });
    expect(parseStepAnswer("estilo", "prefiro sossego")).toEqual({ lifestyle: "tranquilidade" });
    expect(parseStepAnswer("pets", "Tenho um cão grande, ele vai junto.")).toEqual({ pets: "grande" });
    expect(parseStepAnswer("pets", "não")).toEqual({ pets: "nenhum" });
    expect(parseStepAnswer("filhos", "sim, dois filhos")).toEqual({ has_children: true });
    expect(parseStepAnswer("objetivo", "quero alugar")).toEqual({ purpose: "alugar", goal: "morar" });
    expect(parseStepAnswer("objetivo", "morar e depois investir")).toEqual({ purpose: "comprar", goal: "ambos" });
    expect(parseStepAnswer("prazo", "o quanto antes")).toEqual({ timeline: "ate_3_meses" });
    expect(parseStepAnswer("tipo", "um apto")).toEqual({ property_kind: "apartamento" });
  });

  it("devolve null quando não entende (o servidor pergunta à IA)", () => {
    expect(parseStepAnswer("trabalho", "num lugar perto do shopping")).toBeNull();
    expect(parseStepAnswer("orcamento", "depende")).toBeNull();
  });
});
