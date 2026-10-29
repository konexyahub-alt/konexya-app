import { describe, expect, it } from "vitest";
import { dayOf, dayTitle, gridHours, hourOf, joinFirstNames, mondayOf, weekDays, weekOfMonth, weekRange, weekRangeLabel } from "./agenda";

describe("agenda", () => {
  it("acha a segunda-feira no horário de Fortaleza", () => {
    expect(mondayOf("2026-10-29")).toBe("2026-10-26");
    expect(mondayOf("2026-11-01")).toBe("2026-10-26");
    expect(mondayOf("2026-10-26")).toBe("2026-10-26");
    // 1º/11 às 01h UTC ainda é 31/10 em Fortaleza.
    expect(mondayOf(undefined, Date.parse("2026-11-02T01:00:00Z"))).toBe("2026-10-26");
    expect(mondayOf("lixo", Date.parse("2026-10-29T15:00:00Z"))).toBe("2026-10-26");
  });

  it("monta os dias e o intervalo da consulta", () => {
    expect(weekDays("2026-10-26")).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(weekRange("2026-10-26")).toEqual({ from: "2026-10-26T03:00:00.000Z", to: "2026-11-02T03:00:00.000Z" });
  });

  it("escreve a semana como no desenho aprovado", () => {
    expect(weekRangeLabel("2026-10-26")).toBe("26 de outubro a 1º de novembro");
    expect(weekRangeLabel("2026-10-05")).toBe("5 a 11 de outubro");
    expect(weekOfMonth("2026-10-26")).toEqual({ month: "Outubro", week: 5 });
    expect(weekOfMonth("2026-09-28")).toEqual({ month: "Outubro", week: 1 });
    expect(weekOfMonth("2026-11-30")).toEqual({ month: "Dezembro", week: 1 });
    expect(dayTitle("2026-10-30")).toBe("Sex, 30 de outubro");
  });

  it("converte dia e hora para Fortaleza", () => {
    expect(dayOf("2026-10-31T02:00:00Z")).toBe("2026-10-30");
    expect(hourOf("2026-10-30T20:00:00Z")).toBe(17);
  });

  it("amplia a grade só quando precisa e junta os nomes", () => {
    expect(gridHours([10, 17])).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(gridHours([7, 20])[0]).toBe(7);
    expect(gridHours([7, 20]).at(-1)).toBe(20);
    expect(joinFirstNames(["Otto Ramalho", "Bia Lins"])).toBe("Otto e Bia");
    expect(joinFirstNames(["Otto", "Bia", "Rui Sá"])).toBe("Otto, Bia e Rui");
  });
});
