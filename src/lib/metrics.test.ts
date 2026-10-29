import { describe, expect, it } from "vitest";
import { avgReplyMs, deltaCount, deltaPoints, deltaTime, firstMessageKinds, firstResponse, funnel, isOffHours, perDay, periodRange, stageDurations } from "./metrics";

const NOW = Date.parse("2026-10-29T18:00:00Z"); // 15h em Fortaleza
const P = { from: Date.parse("2026-10-01T03:00:00Z"), to: NOW, days: 29, label: "" };

describe("métricas", () => {
  it("monta o período e o anterior do mesmo tamanho", () => {
    const { current, previous } = periodRange("7", undefined, undefined, NOW);
    expect(new Date(current.from).toISOString()).toBe("2026-10-23T03:00:00.000Z");
    expect(previous.to).toBe(current.from);
    expect(current.to - current.from).toBe(previous.to - previous.from);
    const custom = periodRange("custom", "2026-10-01", "2026-10-10", NOW).current;
    expect(new Date(custom.to).toISOString()).toBe("2026-10-11T03:00:00.000Z");
    expect(periodRange("custom", "2026-10-10", "2026-10-01", NOW).current.days).toBe(30);
  });

  it("horário comercial: seg a sex 8h–18h, sábado 8h–12h", () => {
    expect(isOffHours("2026-10-29T12:00:00Z")).toBe(false); // qui 9h
    expect(isOffHours("2026-10-29T22:00:00Z")).toBe(true); // qui 19h
    expect(isOffHours("2026-10-31T14:00:00Z")).toBe(false); // sáb 11h
    expect(isOffHours("2026-10-31T16:00:00Z")).toBe(true); // sáb 13h
    expect(isOffHours("2026-11-01T14:00:00Z")).toBe(true); // dom
  });

  it("primeira resposta humana: média e respondidos em até 15 min", () => {
    const r = firstResponse(
      [
        { id: "a", created_at: "2026-10-10T12:00:00Z", first_human_response_at: "2026-10-10T12:10:00Z" },
        { id: "b", created_at: "2026-10-10T12:00:00Z", first_human_response_at: "2026-10-10T12:30:00Z" },
        { id: "c", created_at: "2026-10-10T12:00:00Z", first_human_response_at: null },
        { id: "d", created_at: "2026-09-10T12:00:00Z", first_human_response_at: "2026-09-10T12:01:00Z" },
      ],
      P,
    );
    expect(r.avgMs).toBe(20 * 60_000);
    expect(r.within15).toBe(0.5);
  });

  it("tempo de resposta conta da primeira mensagem do cliente sem resposta", () => {
    const ms = avgReplyMs(
      [
        { lead_id: "a", sender: "cliente", created_at: "2026-10-10T12:00:00Z" },
        { lead_id: "a", sender: "cliente", created_at: "2026-10-10T12:05:00Z" },
        { lead_id: "a", sender: "corretor", created_at: "2026-10-10T12:20:00Z" },
        { lead_id: "a", sender: "assistente", created_at: "2026-10-10T12:21:00Z" },
        { lead_id: "a", sender: "cliente", created_at: "2026-10-10T13:00:00Z" },
        { lead_id: "a", sender: "corretor", created_at: "2026-10-10T13:40:00Z" },
      ],
      P,
    );
    expect(ms).toBe(30 * 60_000);
  });

  it("conta leads por dia no fuso de Fortaleza", () => {
    const days = perDay(["2026-10-02T02:00:00Z", "2026-10-02T12:00:00Z"], P);
    expect(days[0]).toEqual({ day: "2026-10-01", count: 1 });
    expect(days[1]).toEqual({ day: "2026-10-02", count: 1 });
  });

  it("funil conta quem chegou até cada etapa, mesmo se depois perdeu", () => {
    const counts = funnel(
      [
        { id: "a", stage: "fechado" },
        { id: "b", stage: "perdido" },
        { id: "c", stage: "novo" },
      ],
      [{ lead_id: "b", stage: "qualificado", at: "2026-10-05T12:00:00Z" }],
    );
    expect(counts).toEqual([3, 2, 2, 1, 1, 1]);
  });

  it("tempo em cada etapa vem do histórico", () => {
    const d = stageDurations(
      [
        { lead_id: "a", stage: "novo", at: "2026-10-05T12:00:00Z" },
        { lead_id: "a", stage: "em_atendimento", at: "2026-10-05T12:14:00Z" },
        { lead_id: "a", stage: "qualificado", at: "2026-10-07T12:14:00Z" },
      ],
      P,
    );
    expect(d.map((x) => [x.key, x.avgMs])).toEqual([
      ["novo", 14 * 60_000],
      ["em_atendimento", 2 * 86_400_000],
    ]);
  });

  it("reconhece a primeira mensagem aprovada, editada ou escrita do zero", () => {
    const k = firstMessageKinds(
      [
        { lead_id: "a", sender: "corretor", body: "Oi!", created_at: "2026-10-05T12:00:00Z" },
        { lead_id: "b", sender: "corretor", body: "Olá, tudo bem?", created_at: "2026-10-05T12:00:00Z" },
        { lead_id: "c", sender: "corretor", body: "Escrevi eu", created_at: "2026-10-05T12:00:00Z" },
      ],
      [
        { lead_id: "a", status: "aprovada", final_body: "Oi!" },
        { lead_id: "b", status: "editada", final_body: "Olá, tudo bem?" },
        { lead_id: "c", status: "descartada", final_body: null },
      ],
      new Set(["a", "b", "c"]),
    );
    expect(k).toEqual({ aprovada: 1, editada: 1, zero: 1 });
  });

  it("variação contra o período anterior", () => {
    expect(deltaCount(48, 43)).toEqual({ text: "+12%", good: true });
    expect(deltaCount(2, 2)).toEqual({ text: "igual", good: null });
    expect(deltaPoints(0.71, 0.62)).toEqual({ text: "+9 p.p.", good: true });
    expect(deltaTime(14 * 60_000, 20 * 60_000, (ms) => `${ms / 60_000} min`)).toEqual({ text: "6 min mais rápido", good: true });
  });
});
