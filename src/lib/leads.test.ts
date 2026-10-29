import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE } from "./profile";
import { formatDuration, isAwaiting, isStalled, searchLine, timeAgo } from "./leads";

const now = Date.parse("2026-10-28T12:00:00Z");

describe("lead no painel", () => {
  it("parado há mais de 48 h só nas etapas abertas", () => {
    expect(isStalled({ stage: "em_atendimento", last_message_at: "2026-10-26T11:00:00Z" }, now)).toBe(true);
    expect(isStalled({ stage: "em_atendimento", last_message_at: "2026-10-27T11:00:00Z" }, now)).toBe(false);
    expect(isStalled({ stage: "fechado", last_message_at: "2026-10-01T11:00:00Z" }, now)).toBe(false);
    expect(
      isStalled({ stage: "novo", last_message_at: "2026-10-01T11:00:00Z", consent_revoked_at: "2026-10-02T11:00:00Z" }, now),
    ).toBe(false);
  });

  it("aguardando você até a primeira resposta humana ou com dúvida em aberto", () => {
    expect(isAwaiting({ first_human_response_at: null, consent_revoked_at: null })).toBe(true);
    expect(isAwaiting({ first_human_response_at: "x", consent_revoked_at: null })).toBe(false);
    expect(isAwaiting({ first_human_response_at: "x", consent_revoked_at: null }, 1)).toBe(true);
    expect(isAwaiting({ first_human_response_at: null, consent_revoked_at: "x" })).toBe(false);
  });

  it("o que busca em uma linha", () => {
    expect(searchLine({ ...EMPTY_PROFILE, bedrooms_min: 3, property_kind: "apartamento", neighborhoods: ["Cocó"] })).toBe(
      "3+ quartos · Apartamento · Cocó",
    );
    expect(searchLine(EMPTY_PROFILE)).toBe("Perfil em construção");
  });

  it("tempos legíveis", () => {
    expect(timeAgo("2026-10-28T11:35:00Z", now)).toBe("há 25 min");
    expect(timeAgo("2026-10-27T10:00:00Z", now)).toBe("ontem");
    expect(formatDuration(65 * 60000)).toBe("1 h 05 min");
  });
});
