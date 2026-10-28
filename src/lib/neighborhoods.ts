/**
 * Bairros de Fortaleza, usados só para reconhecer o nome quando o cliente escreve ("trabalho na aldeota").
 * Um nome fora da lista continua aceito como foi escrito; a lista não decide nada sozinha.
 */
export const FORTALEZA_NEIGHBORHOODS = [
  "Aerolândia", "Aeroporto", "Aldeota", "Alto da Balança", "Álvaro Weyne", "Amadeu Furtado", "Ancuri",
  "Antônio Bezerra", "Autran Nunes", "Barra do Ceará", "Barroso", "Bela Vista", "Benfica", "Bom Futuro",
  "Bom Jardim", "Bonsucesso", "Cais do Porto", "Cajazeiras", "Cambeba", "Canindezinho", "Carlito Pamplona",
  "Castelão", "Centro", "Cidade 2000", "Cidade dos Funcionários", "Coaçu", "Cocó", "Conjunto Ceará",
  "Conjunto Esperança", "Conjunto Palmeiras", "Couto Fernandes", "Cristo Redentor", "Curió", "Damas",
  "De Lourdes", "Demócrito Rocha", "Dendê", "Dias Macêdo", "Dionísio Torres", "Dom Lustosa", "Edson Queiroz",
  "Engenheiro Luciano Cavalcante", "Farias Brito", "Fátima", "Floresta", "Genibaú", "Granja Lisboa",
  "Granja Portugal", "Guajeru", "Guararapes", "Henrique Jorge", "Itaoca", "Itaperi", "Jacarecanga",
  "Jangurussu", "Jardim América", "Jardim Cearense", "Jardim das Oliveiras", "Jardim Guanabara",
  "Jardim Iracema", "João XXIII", "Joaquim Távora", "Jóquei Clube", "José Bonifácio", "José de Alencar",
  "Lagoa Redonda", "Manuel Dias Branco", "Manoel Sátiro", "Maraponga", "Meireles", "Messejana", "Mondubim",
  "Monte Castelo", "Montese", "Moura Brasil", "Mucuripe", "Padre Andrade", "Pan Americano", "Papicu",
  "Parangaba", "Parque Araxá", "Parque Dois Irmãos", "Parque Iracema", "Parque Manibura", "Parquelândia",
  "Parreão", "Passaré", "Paupina", "Pedras", "Pici", "Pirambu", "Planalto Ayrton Senna", "Praia de Iracema",
  "Praia do Futuro", "Prefeito José Walter", "Presidente Kennedy", "Presidente Vargas", "Quintino Cunha",
  "Rodolfo Teófilo", "Sabiaguaba", "Salinas", "São Bento", "São Gerardo", "São João do Tauape",
  "Sapiranga", "Serrinha", "Siqueira", "Varjota", "Vicente Pinzón", "Vila Ellery", "Vila Manuel Sátiro",
  "Vila Pery", "Vila União", "Vila Velha",
] as const;

/** Minúsculas, sem acento e com espaços simples: base para comparar textos digitados. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const BY_KEY = new Map(FORTALEZA_NEIGHBORHOODS.map((n) => [normalizeText(n), n]));

/** Nome oficial do bairro, se o texto for exatamente um bairro conhecido. */
export function canonicalNeighborhood(name: string): string | null {
  return BY_KEY.get(normalizeText(name)) ?? null;
}

/** Bairros citados num texto livre, do nome mais longo para o mais curto (evita "Centro" dentro de outro nome). */
export function findNeighborhoods(text: string): string[] {
  let rest = ` ${normalizeText(text).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ")} `;
  const found: string[] = [];
  const keys = [...BY_KEY.keys()].sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const needle = ` ${key} `;
    if (rest.includes(needle)) {
      found.push(BY_KEY.get(key)!);
      rest = rest.replace(needle, " ");
    }
  }
  return found;
}

/** Igualdade de bairros ignorando acento e caixa. */
export function sameNeighborhood(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return normalizeText(a) === normalizeText(b);
}
