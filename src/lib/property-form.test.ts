import { describe, expect, it } from "vitest";
import { parseBRNumber, publishProblems, stepBasicSchema, stepValuesSchema } from "./property-form";

describe("parseBRNumber", () => {
  it.each([
    ["685.000", 685000],
    ["685000", 685000],
    ["R$ 1.450.000", 1450000],
    ["1.234,56", 1234.56],
    ["92,5", 92.5],
    ["92.5", 92.5],
    ["", null],
  ])("%s → %s", (input, out) => expect(parseBRNumber(input)).toBe(out));
  it("texto inválido vira NaN para o formulário apontar o erro", () => expect(parseBRNumber("abc")).toBeNaN());
});

describe("passos do cadastro", () => {
  it("valores aceitam vazio, mas não negativo nem texto", () => {
    expect(stepValuesSchema.parse({ price: "", condo_fee: "0" })).toMatchObject({ price: null, condo_fee: 0 });
    expect(stepValuesSchema.safeParse({ price: "-1" }).success).toBe(false);
    expect(stepValuesSchema.safeParse({ price: "abc" }).success).toBe(false);
    expect(stepValuesSchema.safeParse({ area_m2: "6.000.000" }).success).toBe(false);
    expect(stepValuesSchema.parse({ area_m2: "120" }).area_m2).toBe(120);
  });
  it("CEP aceita máscara", () => {
    expect(stepBasicSchema.parse({ purpose: "venda", type: "casa", postal_code: "60.150-160" }).postal_code).toBe("60150160");
    expect(stepBasicSchema.parse({ purpose: "venda", type: "casa", neighborhood: "meireles" }).neighborhood).toBe("Meireles");
    expect(stepBasicSchema.parse({ purpose: "venda", type: "casa", neighborhood: "Vila Nova Sul" }).neighborhood).toBe("Vila Nova Sul");
  });
  it("lista o que falta para publicar", () => {
    expect(publishProblems({ title: null, price: 1, neighborhood: "Aldeota" })).toHaveLength(1);
    expect(publishProblems({ title: "A", price: 1, neighborhood: "B" })).toEqual([]);
  });
});
