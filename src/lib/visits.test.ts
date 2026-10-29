import { describe, expect, it } from "vitest";
import { buildIcs, conflictingIds, formatVisitWhen, fromLocalInput, toLocalInput } from "./visits";

describe("visitas", () => {
  it("formata a data como as mensagens do banco, no fuso de Fortaleza", () => {
    expect(formatVisitWhen("2026-10-30T20:00:00Z")).toBe("sex, 30/10, 17h");
    expect(formatVisitWhen("2026-10-31T13:30:00Z")).toBe("sáb, 31/10, 10h30");
  });

  it("converte o campo de data e hora (Fortaleza) para ISO e de volta", () => {
    expect(fromLocalInput("2026-10-30T17:00")).toBe("2026-10-30T20:00:00.000Z");
    expect(fromLocalInput("ontem")).toBeNull();
    expect(toLocalInput("2026-10-30T20:00:00.000Z")).toBe("2026-10-30T17:00");
  });

  it("aponta horário duplicado só para o mesmo corretor e visitas ativas", () => {
    const base = { durationMin: 60, status: "pedida" as const };
    const ids = conflictingIds([
      { ...base, id: "a", brokerId: "x", startsAt: "2026-10-30T20:00:00Z" },
      { ...base, id: "b", brokerId: "x", startsAt: "2026-10-30T20:30:00Z" },
      { ...base, id: "c", brokerId: "y", startsAt: "2026-10-30T20:00:00Z" },
      { ...base, id: "d", brokerId: "x", startsAt: "2026-10-30T20:00:00Z", status: "cancelada" },
      { ...base, id: "e", brokerId: "x", startsAt: "2026-10-30T21:30:00Z" },
    ]);
    expect([...ids].sort()).toEqual(["a", "b"]);
  });

  it("gera o arquivo de calendário com início, fim e endereço", () => {
    const ics = buildIcs({
      id: "v1",
      startsAt: "2026-10-31T13:00:00Z",
      durationMin: 60,
      title: "Visita: Edifício Exemplo, Cocó",
      location: "Rua Exemplo, 200, Cocó, Fortaleza",
      description: "Cliente: Ana",
    });
    expect(ics).toContain("DTSTART:20261031T130000Z");
    expect(ics).toContain("DTEND:20261031T140000Z");
    expect(ics).toContain("LOCATION:Rua Exemplo\\, 200\\, Cocó\\, Fortaleza");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});
