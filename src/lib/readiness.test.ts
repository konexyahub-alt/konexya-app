import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE } from "./profile";
import { qualificationItems, readiness } from "./readiness";

describe("prontidão do lead", () => {
  it("segue o prazo e o orçamento informados pelo cliente", () => {
    expect(readiness({ ...EMPTY_PROFILE, timeline: "ate_3_meses", budget_max: 900_000 })).toBe("pronto_para_visitar");
    expect(readiness({ ...EMPTY_PROFILE, timeline: "ate_3_meses" })).toBe("pesquisando");
    expect(readiness({ ...EMPTY_PROFILE, timeline: "ate_6_meses" })).toBe("pesquisando");
    expect(readiness({ ...EMPTY_PROFILE, timeline: "pesquisando" })).toBe("curioso");
    expect(readiness(EMPTY_PROFILE)).toBe("curioso");
  });

  it("qualificação marca o que falta como a confirmar", () => {
    const items = qualificationItems(EMPTY_PROFILE, { pagamento: { value: "À vista", at: "x" } }, "2026-10-28");
    expect(items.find((i) => i.label === "Pagamento")?.value).toBe("À vista");
    expect(items.find((i) => i.label === "Orçamento informado")?.value).toBeNull();
    expect(items.find((i) => i.label === "Consentimento LGPD")?.value).toBe("Autorizado");
  });
});
