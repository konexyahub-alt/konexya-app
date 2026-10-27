/**
 * Faixas da nota de compatibilidade (regra de negócio 7):
 * verde ≥ 85, amarelo 75–84, vermelho < 75.
 */
export type ScoreBand = "ok" | "warn" | "bad";

export const SCORE_BAND_MIN_OK = 85;
export const SCORE_BAND_MIN_WARN = 75;

export function scoreBand(score: number): ScoreBand {
  if (!Number.isFinite(score)) throw new RangeError(`Nota inválida: ${score}`);
  if (score >= SCORE_BAND_MIN_OK) return "ok";
  if (score >= SCORE_BAND_MIN_WARN) return "warn";
  return "bad";
}
