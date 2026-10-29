import { TIMEZONE } from "@/lib/visits";

/**
 * Semana da agenda de visitas (P-05), sempre no horário de Fortaleza (UTC−3, sem horário de verão).
 * Dias são "AAAA-MM-DD"; a semana vai de segunda a domingo.
 */
const DAY_MS = 86_400_000;
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const toDay = (d: Date) => d.toISOString().slice(0, 10);

/** Dia (em Fortaleza) de um instante. */
export function dayOf(iso: string | number | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** Hora cheia (0–23, em Fortaleza) de um instante. */
export function hourOf(iso: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, hour: "2-digit", hour12: false }).format(new Date(iso))) % 24;
}

export function addDays(day: string, n: number): string {
  return toDay(new Date(toDate(day).getTime() + n * DAY_MS));
}

/** Segunda-feira da semana do dia. Aceita qualquer texto: inválido vira a semana de hoje. */
export function mondayOf(day: string | undefined, now = Date.now()): string {
  const base = day && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(toDate(day).getTime()) ? day : dayOf(now);
  const weekday = (toDate(base).getUTCDay() + 6) % 7;
  return addDays(base, -weekday);
}

export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Início e fim (exclusivo) da semana, em ISO, para a consulta. */
export function weekRange(monday: string): { from: string; to: string } {
  return { from: new Date(`${monday}T00:00:00-03:00`).toISOString(), to: new Date(`${addDays(monday, 7)}T00:00:00-03:00`).toISOString() };
}

const dayNumber = (day: string) => {
  const n = Number(day.slice(8, 10));
  return n === 1 ? "1º" : String(n);
};

/** "26 de outubro a 1º de novembro" (ou "5 a 11 de outubro" no mesmo mês). */
export function weekRangeLabel(monday: string): string {
  const sunday = addDays(monday, 6);
  const m1 = MONTHS[Number(monday.slice(5, 7)) - 1];
  const m2 = MONTHS[Number(sunday.slice(5, 7)) - 1];
  return m1 === m2 ? `${dayNumber(monday)} a ${dayNumber(sunday)} de ${m2}` : `${dayNumber(monday)} de ${m1} a ${dayNumber(sunday)} de ${m2}`;
}

/**
 * "Outubro, semana 5": a semana pertence ao mês onde cai a maior parte dela (a quinta-feira), e conta a
 * partir da semana que tem o dia 1. Assim 26/10 a 1º/11 é a semana 5 de outubro, como no desenho aprovado.
 */
export function weekOfMonth(monday: string): { month: string; week: number } {
  const thursday = addDays(monday, 3);
  const month = MONTHS[Number(thursday.slice(5, 7)) - 1];
  const week = Math.ceil(Number(thursday.slice(8, 10)) / 7);
  return { month: month[0].toUpperCase() + month.slice(1), week };
}

/** "Sex, 30 de outubro" para o título do dia. */
export function dayTitle(day: string): string {
  const weekday = WEEKDAYS[(toDate(day).getUTCDay() + 6) % 7];
  return `${weekday}, ${dayNumber(day)} de ${MONTHS[Number(day.slice(5, 7)) - 1]}`;
}

/** Horas mostradas na grade: das 8h às 18h, ampliando se houver visita fora disso. */
export function gridHours(hours: number[]): number[] {
  const first = Math.min(8, ...hours);
  const last = Math.max(18, ...hours);
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/** Primeiros nomes juntos: "Otto e Bia", "Otto, Bia e Rui". */
export function joinFirstNames(names: string[]): string {
  const first = names.map((n) => n.trim().split(/\s+/)[0] || n);
  return first.length <= 1 ? (first[0] ?? "") : `${first.slice(0, -1).join(", ")} e ${first.at(-1)}`;
}
