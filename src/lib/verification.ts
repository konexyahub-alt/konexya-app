import { normalizeText } from "@/lib/neighborhoods";

/**
 * Conferência automática do cadastro de anunciante (docs/DECISOES.md, 2026-10-29). Ajuda o admin: cada item
 * vem como ok, falhou ou indisponível. A aprovação continua manual.
 */
export type CheckStatus = "ok" | "falhou" | "indisponivel";
export type Check = { status: CheckStatus; detail: string };
export type Verification = {
  checkedAt: string;
  cnpj?: { situacao: Check; nome: Check; atividade: Check };
};

/** Atividades (CNAE) de corretagem e administração de imóveis. */
export const REAL_ESTATE_CNAES: Record<number, string> = {
  6821801: "Corretagem na compra e venda e avaliação de imóveis",
  6821802: "Corretagem no aluguel de imóveis",
  6822600: "Gestão e administração da propriedade imobiliária",
};

const COMPANY_SUFFIXES = /\b(ltda|me|epp|eireli|s\/?a|sa|mei|limitada|sociedade|empresarial)\b/g;

/** Razão social comparável: sem acento, pontuação e sufixos de tipo de empresa. */
export function comparableName(name: string): string {
  return normalizeText(name)
    .replace(/[.,\-/&]/g, " ")
    .replace(COMPANY_SUFFIXES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type ReceitaCnpj = {
  razao_social?: string;
  descricao_situacao_cadastral?: string;
  cnae_fiscal?: number;
  cnaes_secundarios?: { codigo: number }[];
};

/** Avalia a resposta da Receita (via BrasilAPI) contra o que a imobiliária informou. */
export function evaluateCnpj(data: ReceitaCnpj, informedName: string): NonNullable<Verification["cnpj"]> {
  const situacao = (data.descricao_situacao_cadastral ?? "").toUpperCase();
  const official = data.razao_social ?? "";
  const codes = [data.cnae_fiscal, ...(data.cnaes_secundarios ?? []).map((c) => c.codigo)].filter(
    (c): c is number => typeof c === "number",
  );
  const match = codes.find((c) => REAL_ESTATE_CNAES[c]);
  const a = comparableName(official);
  const b = comparableName(informedName);
  return {
    situacao:
      situacao === "ATIVA"
        ? { status: "ok", detail: "CNPJ ativo na Receita Federal" }
        : { status: "falhou", detail: `Situação na Receita: ${situacao || "não informada"}` },
    nome:
      a && b && (a === b || a.includes(b) || b.includes(a))
        ? { status: "ok", detail: `Razão social confere: ${official}` }
        : { status: "falhou", detail: `Na Receita: ${official || "não informada"}` },
    atividade: match
      ? { status: "ok", detail: REAL_ESTATE_CNAES[match] }
      : { status: "falhou", detail: "Nenhuma atividade de corretagem ou administração de imóveis no CNPJ" },
  };
}

const UNAVAILABLE: Check = { status: "indisponivel", detail: "Consulta à Receita indisponível agora; confira à mão" };

/** Consulta o CNPJ (14 dígitos) na BrasilAPI, que repassa os dados públicos da Receita Federal. */
export async function verifyCnpj(cnpj: string, informedName: string): Promise<NonNullable<Verification["cnpj"]>> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { signal: AbortSignal.timeout(6000) });
    if (res.status === 404) {
      const notFound: Check = { status: "falhou", detail: "CNPJ não encontrado na Receita Federal" };
      return { situacao: notFound, nome: notFound, atividade: notFound };
    }
    if (!res.ok) return { situacao: UNAVAILABLE, nome: UNAVAILABLE, atividade: UNAVAILABLE };
    return evaluateCnpj((await res.json()) as ReceitaCnpj, informedName);
  } catch {
    return { situacao: UNAVAILABLE, nome: UNAVAILABLE, atividade: UNAVAILABLE };
  }
}
