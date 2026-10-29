import { describe, expect, it } from "vitest";
import { comparableName, evaluateCnpj } from "./verification";

describe("conferência automática do CNPJ", () => {
  it("compara razão social sem acento, pontuação e tipo de empresa", () => {
    expect(comparableName("Imobiliária Teste Ltda.")).toBe("imobiliaria teste");
    expect(comparableName("IMOBILIARIA TESTE LTDA - ME")).toBe("imobiliaria teste");
  });

  it("aprova os três itens quando tudo bate", () => {
    const r = evaluateCnpj(
      { razao_social: "IMOBILIARIA TESTE LTDA", descricao_situacao_cadastral: "ATIVA", cnae_fiscal: 6821801 },
      "Imobiliária Teste Ltda.",
    );
    expect([r.situacao.status, r.nome.status, r.atividade.status]).toEqual(["ok", "ok", "ok"]);
  });

  it("aponta CNPJ baixado, nome diferente e atividade fora do ramo", () => {
    const r = evaluateCnpj(
      { razao_social: "PADARIA BOM PAO LTDA", descricao_situacao_cadastral: "BAIXADA", cnae_fiscal: 1091101 },
      "Imobiliária Teste Ltda.",
    );
    expect([r.situacao.status, r.nome.status, r.atividade.status]).toEqual(["falhou", "falhou", "falhou"]);
    expect(r.situacao.detail).toContain("BAIXADA");
  });

  it("aceita a atividade imobiliária como secundária", () => {
    const r = evaluateCnpj(
      { razao_social: "X", descricao_situacao_cadastral: "ATIVA", cnae_fiscal: 4110700, cnaes_secundarios: [{ codigo: 6822600 }] },
      "X",
    );
    expect(r.atividade.status).toBe("ok");
  });
});
