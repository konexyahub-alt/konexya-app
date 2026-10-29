import { describe, expect, it } from "vitest";
import { compareAnalysis, compareRows, type CompareProperty } from "./compare";
import { EMPTY_PROFILE, type Profile } from "./profile";

const base: CompareProperty = {
  id: "a",
  title: "Residencial A",
  purpose: "venda",
  type: "apartamento",
  price: 790000,
  bedrooms: 2,
  parking_spots: 1,
  pets: "qualquer",
  neighborhood: "Varjota",
  amenities: ["Piscina", "Academia"],
  has_seal: true,
  area_m2: 74,
  condo_fee: 650,
  iptu_monthly: 120,
};
const props: CompareProperty[] = [
  base,
  { ...base, id: "b", title: "Edifício B", price: 885000, bedrooms: 3, parking_spots: 2, pets: "pequeno", neighborhood: "Cocó", area_m2: 96, condo_fee: 780 },
  { ...base, id: "c", title: "Edifício C", price: 950000, bedrooms: 3, parking_spots: 2, neighborhood: "Aldeota", amenities: [], area_m2: 82, condo_fee: 900 },
];
const full: Profile = { ...EMPTY_PROFILE, purpose: "comprar", budget_max: 900000, property_kind: "apartamento", pets: "grande", priorities: ["lazer_no_predio"] };

describe("comparação moldada pelo perfil", () => {
  it("só mostra na tabela principal o que o cliente mencionou", () => {
    const { main, details } = compareRows(props, full);
    expect(main.map((r) => r.key)).toEqual(["preco", "condominio", "area", "pets", "lazer"]);
    expect(details.map((r) => r.key)).toEqual(["bairro", "quartos", "vagas", "iptu"]);
  });

  it("destaca o melhor valor e colore pelo perfil", () => {
    const { main } = compareRows(props, full);
    const price = main.find((r) => r.key === "preco")!;
    expect(price.cells.map((c) => c.best)).toEqual([true, false, false]);
    expect(price.cells.map((c) => c.tone)).toEqual(["ok", "ok", "warn"]);
    const pets = main.find((r) => r.key === "pets")!;
    expect(pets.cells.map((c) => c.text)).toEqual(["Qualquer porte", "Só pequeno", "Qualquer porte"]);
    expect(pets.cells[1].tone).toBe("bad");
    expect(main.find((r) => r.key === "area")!.cells.map((c) => c.best)).toEqual([false, true, false]);
  });

  it("não destaca nada quando todos são iguais", () => {
    const { main } = compareRows([base, { ...base, id: "x" }], full);
    expect(main.every((r) => r.cells.every((c) => !c.best))).toBe(true);
  });

  it("a análise aponta o que mais combina, com os motivos do app", () => {
    const a = compareAnalysis(props, full);
    expect(a.headline?.id).toBe("a");
    expect(a.headline?.text).toMatch(/^é o que mais combina com você \(100%\)/);
    expect(a.others.map((o) => o.id)).toEqual(["b", "c"]);
    expect(a.others.find((o) => o.id === "b")?.text).toContain("custa R$ 95.000 a mais");
    expect(a.others.find((o) => o.id === "b")?.text).toContain("só aceita pets de porte pequeno");
    expect(a.invite).toBeNull();
  });

  it("perfil com pouca informação gera convite para completar", () => {
    const thin: Profile = { ...EMPTY_PROFILE, purpose: "comprar", budget_max: 900000 };
    const a = compareAnalysis(props, thin);
    expect(a.invite).toBe("Me conte se você tem pet ou se precisa de vaga para eu comparar melhor.");
    expect(compareRows(props, thin).main.map((r) => r.key)).toEqual(["preco", "condominio", "area"]);
  });

  it("sem nenhum critério, não inventa vencedor", () => {
    const a = compareAnalysis(props, EMPTY_PROFILE);
    expect(a.headline).toBeNull();
    expect(a.invite).toMatch(/^Me conte/);
  });
});
