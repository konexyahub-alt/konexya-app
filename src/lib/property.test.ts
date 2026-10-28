import { describe, expect, it } from "vitest";
import { missingSealItems, sealChecklist, sortPhotos, type SealInput } from "./property";
import { formatBRL } from "./format";

const complete: SealInput = {
  photoCount: 5,
  area_m2: 92,
  price: 685000,
  condo_fee: 780,
  iptu_monthly: 160,
  description: "a".repeat(200),
  pin_confirmed: true,
};

describe("checklist do selo (regra 9)", () => {
  it("imóvel completo não tem pendências", () => {
    expect(missingSealItems(sealChecklist(complete))).toBe(0);
  });
  it.each([
    ["fotos", { photoCount: 4 }],
    ["valores", { condo_fee: null }],
    ["descricao", { description: "  curta  " }],
    ["pino", { pin_confirmed: false }],
  ] as const)("aponta o item %s", (key, change) => {
    const items = sealChecklist({ ...complete, ...change });
    expect(items.filter((i) => !i.done).map((i) => i.key)).toEqual([key]);
  });
  it("segue a regra configurada", () => {
    const items = sealChecklist(complete, { minPhotos: 8, minDescriptionChars: 200 });
    expect(items[0]).toMatchObject({ label: "8 fotos ou mais", done: false });
  });
  it("condomínio zero conta como preenchido", () => {
    expect(missingSealItems(sealChecklist({ ...complete, condo_fee: 0 }))).toBe(0);
  });
});

describe("fotos e valores", () => {
  it("capa vem primeiro, depois a ordem", () => {
    const sorted = sortPhotos([
      { position: 1, is_cover: false },
      { position: 0, is_cover: false },
      { position: 2, is_cover: true },
    ]);
    expect(sorted.map((p) => p.position)).toEqual([2, 0, 1]);
  });
  it("formata reais sem centavos", () => {
    expect(formatBRL(685000)).toBe("R$ 685.000");
    expect(formatBRL(null)).toBeNull();
  });
});
