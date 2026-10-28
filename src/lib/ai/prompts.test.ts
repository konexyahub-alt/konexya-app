import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE } from "@/lib/profile";
import {
  assistantSystemPrompt,
  chatSystemPrompt,
  fixPra,
  propertyFacts,
  sanitizeChatUpdates,
  type ChatOutput,
  type PropertyFacts,
} from "./prompts";

const none: ChatOutput["updates"] = {
  priorities: null, work_neighborhood: null, works_from_home: null, commute_max_min: null, lifestyle: null,
  has_children: null, pets: null, purpose: null, goal: null, timeline: null, budget_min: null, budget_max: null,
  property_kind: null, bedrooms_min: null, parking_min: null, neighborhoods: null, extras: null,
};

const facts: PropertyFacts = {
  id: "p1", title: "Edifício Exemplo", type: "apartamento", purpose: "venda", neighborhood: "Cocó", price: 885000,
  condo_fee: null, iptu_monthly: 160, area_m2: 96, bedrooms: 3, suites: 1, bathrooms: 2, parking_spots: 2,
  pets: "pequeno", furnished: null, floor: null, view: null, amenities: [],
};

describe("validação do que a IA devolve (antes de gravar)", () => {
  it("descarta valores fora de faixa e normaliza bairros", () => {
    const out = sanitizeChatUpdates({
      ...none,
      budget_max: 12,
      commute_max_min: 999,
      bedrooms_min: 3.4,
      work_neighborhood: "aldeota",
      neighborhoods: ["cocó", "Cocó", " "],
    });
    expect(out).toEqual({ bedrooms_min: 3, work_neighborhood: "Aldeota", works_from_home: false, neighborhoods: ["Cocó"] });
  });

  it("orçamento mínimo maior que o máximo é descartado", () => {
    expect(sanitizeChatUpdates({ ...none, budget_min: 900_000, budget_max: 800_000 })).toEqual({
      budget_max: 800_000,
      budget_min: null,
    });
  });

  it("aluguel é sempre para morar", () => {
    expect(sanitizeChatUpdates({ ...none, purpose: "alugar", goal: "investir" })).toEqual({ purpose: "alugar", goal: "morar" });
  });

  it("nada informado, nada muda", () => {
    expect(sanitizeChatUpdates(none)).toEqual({});
  });
});

describe("instruções da IA (regra 8)", () => {
  it("o anúncio sem um dado aparece como não informado, para a IA não preencher", () => {
    const f = propertyFacts(facts);
    expect(f.condominio).toBe("não informado");
    expect(f.preco).toBe(885000);
  });

  it("todo prompt proíbe inventar dados, nota de segurança e promessa de valorização", () => {
    const prompts = [
      chatSystemPrompt({ profile: EMPTY_PROFILE, pendingQuestion: null, properties: [facts] }),
      assistantSystemPrompt({ assistantName: "Lia", agencyName: "Imob", clientName: "Ana", pendingQuestion: null, properties: [facts] }),
    ];
    for (const p of prompts) {
      expect(p).toContain("Nunca invente imóvel, preço");
      expect(p).toContain("segurança de bairro");
      expect(p).toContain("valorização");
      expect(p).toContain("estimativa");
    }
  });

  it("a assistente não agenda, não negocia e não promete; encaminha o resto ao corretor", () => {
    const p = assistantSystemPrompt({ assistantName: "Lia", agencyName: "Imob", clientName: "Ana", pendingQuestion: null, properties: [] });
    expect(p).toContain("NÃO agenda visita, NÃO negocia");
    expect(p).toContain('kind "encaminhar"');
    expect(p).toContain("nunca fala em nome do corretor");
  });

  it('troca "pra" por "para"', () => {
    expect(fixPra("Pra você e pra mim, uma praia")).toBe("Para você e para mim, uma praia");
  });
});
