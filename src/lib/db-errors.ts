/**
 * As funções do banco (visitas, propostas) explicam o problema em português na própria mensagem. Mostramos
 * essa frase quando o código é de regra de negócio; qualquer outro erro vira uma frase genérica.
 */
const FRIENDLY = new Set(["P0001", "P0002", "22023", "23505", "42501"]);

export function friendlyDbError(error: { code?: string; message: string } | null, fallback: string): string | undefined {
  if (!error) return undefined;
  return error.code && FRIENDLY.has(error.code) ? error.message : fallback;
}
