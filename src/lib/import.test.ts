import { describe, expect, it } from "vitest";
import { mapHeaders, parseRow, toPropertyInsert, wouldGetSeal } from "./import";
import { DEFAULT_SEAL_RULES } from "./property";

const base = {
  codigo: "AP-1",
  nome_do_anuncio: "Apartamento com varanda",
  finalidade: "Venda",
  tipo: "Apto",
  bairro: "Aldeota",
  valor: "685.000",
  condominio: "780",
  iptu_mensal: "160",
  area_m2: "92",
  quartos: "3",
  aceita_pets: "pequeno",
  mobiliado: "não",
  itens_do_predio: "Piscina; academia; Heliponto",
  descricao: "a".repeat(200),
  fotos: "https://x.test/1.jpg; https://x.test/2.jpg https://x.test/3.jpg;https://x.test/4.jpg;https://x.test/5.jpg",
  latitude: "-3,73",
  longitude: "-38,5",
};

describe("cabeçalhos", () => {
  it("aceita os rótulos da planilha modelo, sem acento e em qualquer caixa", () => {
    expect(mapHeaders(["Código", "NOME DO ANÚNCIO", "Área útil (m²)", "IPTU", "coluna estranha"])).toEqual([
      "codigo",
      "nome_do_anuncio",
      "area_m2",
      "iptu_mensal",
      null,
    ]);
  });
});

describe("linhas", () => {
  it("normaliza uma linha completa", () => {
    const r = parseRow(2, base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.row).toMatchObject({
      finalidade: "venda",
      tipo: "apartamento",
      valor: 685000,
      aceita_pets: "pequeno",
      mobiliado: false,
      itens_do_predio: ["Piscina", "Academia"],
    });
    expect(r.row.fotos).toHaveLength(5);
    expect(wouldGetSeal(r.row, DEFAULT_SEAL_RULES)).toBe(true);
    expect(toPropertyInsert(r.row, "ag")).toMatchObject({ pin_confirmed: true, lat: -3.73, external_ref: "AP-1" });
  });

  it.each([
    [{ valor: "" }, "Valor vazio"],
    [{ tipo: "loft" }, 'Tipo de imóvel não reconhecido: "loft"'],
    [{ bairro: "" }, "Bairro vazio"],
    [{ fotos: "http://inseguro.test/1.jpg" }, "Link de foto precisa começar com https://"],
    [{ latitude: "" }, "Informe latitude e longitude juntas"],
  ])("explica o erro %o", (change, reason) => {
    const r = parseRow(7, { ...base, ...change });
    expect(r).toEqual({ line: 7, ok: false, reason });
  });

  it("sem fotos suficientes não ganha selo", () => {
    const r = parseRow(3, { ...base, fotos: "https://x.test/1.jpg" });
    expect(r.ok && wouldGetSeal(r.row, DEFAULT_SEAL_RULES)).toBe(false);
  });
});
