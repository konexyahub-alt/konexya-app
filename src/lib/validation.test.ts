import { describe, expect, it } from "vitest";
import { emailSchema, formatCnpj, isValidCnpj, normalizePhone, otpSchema, partnerSchema } from "./validation";

describe("CNPJ", () => {
  it.each(["11.222.333/0001-81", "11222333000181", "04.252.011/0001-10"])("aceita %s", (v) => {
    expect(isValidCnpj(v)).toBe(true);
  });
  it.each(["11.222.333/0001-82", "11111111111111", "123", ""])("recusa %s", (v) => {
    expect(isValidCnpj(v)).toBe(false);
  });
  it("formata enquanto digita", () => {
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });
});

describe("telefone", () => {
  it.each([
    ["(85) 99999-0000", "85999990000"],
    ["+55 85 99999-0000", "85999990000"],
    ["85 3333-4444", "8533334444"],
  ])("%s → %s", (input, out) => expect(normalizePhone(input)).toBe(out));
  it("recusa número sem DDD", () => expect(normalizePhone("99999-0000")).toBeNull());
});

describe("e-mail e código", () => {
  it("normaliza o e-mail", () => expect(emailSchema.parse("  Ana@Email.COM ")).toBe("ana@email.com"));
  it("explica o erro de e-mail incompleto", () => {
    const r = emailSchema.safeParse("ana@gmail");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/voce@email.com/);
  });
  it("aceita só 6 dígitos no código", () => {
    expect(otpSchema.safeParse("123456").success).toBe(true);
    expect(otpSchema.safeParse("12345").success).toBe(false);
  });
});

describe("cadastro de parceiro", () => {
  it("normaliza CNPJ e WhatsApp", () => {
    const r = partnerSchema.parse({
      legalName: " Imobiliária Exemplo Ltda. ",
      cnpj: "11.222.333/0001-81",
      creci: "J-1234",
      managerName: "Ana",
      whatsapp: "(85) 99999-0000",
    });
    expect(r).toMatchObject({ legalName: "Imobiliária Exemplo Ltda.", cnpj: "11222333000181", whatsapp: "85999990000" });
  });
});
