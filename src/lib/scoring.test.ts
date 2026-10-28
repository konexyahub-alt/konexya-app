import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE, type Profile } from "./profile";
import { DEFAULT_WEIGHTS, rankProperties, readWeights, scoreProperty, type ScoredProperty } from "./scoring";

const profile: Profile = {
  ...EMPTY_PROFILE,
  purpose: "comprar",
  budget_max: 900_000,
  property_kind: "apartamento",
  pets: "grande",
  work_neighborhood: "Aldeota",
  works_from_home: false,
};

function prop(over: Partial<ScoredProperty> = {}): ScoredProperty {
  return {
    id: over.id ?? "p1",
    purpose: "venda",
    type: "apartamento",
    price: 850_000,
    bedrooms: 3,
    parking_spots: 2,
    pets: "qualquer",
    neighborhood: "Aldeota",
    amenities: [],
    has_seal: false,
    ...over,
  };
}

describe("nota de compatibilidade (regra 7)", () => {
  it("é determinística: mesmo perfil e imóvel, mesma nota e motivos", () => {
    expect(scoreProperty(prop(), profile)).toEqual(scoreProperty(prop(), profile));
  });

  it("toda nota vem com os motivos por critério", () => {
    const r = scoreProperty(prop(), profile)!;
    expect(r.score).toBe(100);
    expect(r.band).toBe("ok");
    expect(r.reasons.map((x) => x.criterion).sort()).toEqual(["localizacao", "orcamento", "pets", "tipo"]);
    expect(r.reasons.every((x) => x.text.length > 0)).toBe(true);
  });

  it("acima do orçamento perde pontos e diz quanto", () => {
    const r = scoreProperty(prop({ price: 990_000 }), profile)!;
    const reason = r.reasons.find((x) => x.criterion === "orcamento")!;
    expect(reason.text).toBe("10% acima do orçamento informado");
    expect(reason.band).toBe("bad");
    expect(r.score).toBeLessThan(100);
  });

  it("pet grande em condomínio que só aceita pequenos é um motivo vermelho", () => {
    const r = scoreProperty(prop({ pets: "pequeno" }), profile)!;
    expect(r.reasons.find((x) => x.criterion === "pets")).toEqual({
      criterion: "pets",
      band: "bad",
      text: "Condomínio só aceita pets de porte pequeno",
    });
  });

  it("dado que o anúncio não tem vira aviso, nunca suposição", () => {
    const r = scoreProperty(prop({ pets: null }), profile)!;
    expect(r.reasons.find((x) => x.criterion === "pets")?.text).toBe("O anúncio não informa se aceita pets");
  });

  it("critério sem informação no perfil fica fora da conta", () => {
    const r = scoreProperty(prop(), { ...EMPTY_PROFILE, purpose: "comprar", budget_max: 900_000 })!;
    expect(r.reasons.map((x) => x.criterion)).toEqual(["orcamento"]);
  });

  it("sem nenhum critério aplicável, não há nota", () => {
    expect(scoreProperty(prop(), EMPTY_PROFILE)).toBeNull();
  });

  it("faixas: verde ≥ 85, amarelo 75–84, vermelho < 75", () => {
    const p: Profile = { ...EMPTY_PROFILE, budget_max: 1_000_000 };
    expect(scoreProperty(prop({ price: 1_000_000 }), p)!.band).toBe("ok");
    expect(scoreProperty(prop({ price: 1_050_000 }), p)!.band).toBe("warn"); // 5% acima → 80
    expect(scoreProperty(prop({ price: 1_100_000 }), p)!.band).toBe("bad"); // 10% acima → 60
  });

  it("pesos configuráveis mudam a nota; peso zero tira o critério", () => {
    const w = { ...DEFAULT_WEIGHTS, pets: 0 };
    const r = scoreProperty(prop({ pets: "nao" }), profile, w)!;
    expect(r.reasons.some((x) => x.criterion === "pets")).toBe(false);
    expect(r.score).toBe(100);
  });

  it("pesos inválidos do banco voltam para o padrão", () => {
    expect(readWeights({ orcamento: "abc", tipo: 500, pets: 5 })).toEqual({ ...DEFAULT_WEIGHTS, pets: 5 });
    expect(readWeights(null)).toEqual(DEFAULT_WEIGHTS);
  });

  it("não tem critério de potencial de investimento", () => {
    expect(Object.keys(DEFAULT_WEIGHTS)).not.toContain("investimento");
  });
});

describe("recomendações", () => {
  it("filtram compra × aluguel e imóveis não residenciais", () => {
    const list = [
      prop({ id: "venda" }),
      prop({ id: "aluguel", purpose: "aluguel", price: 4000 }),
      prop({ id: "sala", type: "sala_comercial" }),
    ];
    expect(rankProperties(list, profile).map((r) => r.property.id)).toEqual(["venda"]);
  });

  it("o selo só desempata ou dá vantagem pequena, sem passar à frente de muito mais compatível", () => {
    const better = prop({ id: "melhor", price: 850_000 }); // 100
    const sealed = prop({ id: "selo", price: 960_000, has_seal: true }); // acima do orçamento
    const twin = prop({ id: "gemeo-selo", price: 850_000, has_seal: true }); // 100 + selo
    const ranked = rankProperties([better, sealed, twin], profile);
    expect(ranked.map((r) => r.property.id)).toEqual(["gemeo-selo", "melhor", "selo"]);
    expect(ranked[0].score).toBe(100); // o bônus não altera a nota mostrada
  });
});
