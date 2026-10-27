import { describe, expect, it } from "vitest";
import { scoreBand } from "./score-band";

describe("scoreBand (regra 7: verde ≥ 85, amarelo 75–84, vermelho < 75)", () => {
  it.each([
    [100, "ok"],
    [85, "ok"],
    [84.99, "warn"],
    [75, "warn"],
    [74.99, "bad"],
    [0, "bad"],
  ] as const)("%s → %s", (score, band) => {
    expect(scoreBand(score)).toBe(band);
  });

  it("rejeita nota inválida", () => {
    expect(() => scoreBand(Number.NaN)).toThrow(RangeError);
  });
});
