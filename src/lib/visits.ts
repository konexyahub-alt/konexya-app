import type { Database } from "@/lib/supabase/database.types";

/** Visitas e propostas (etapa 3, F6 e F7). Regras no banco; aqui só rótulos, datas e o arquivo de calendário. */
export type VisitStatus = Database["public"]["Enums"]["visit_status"];
export type ProposalStatus = Database["public"]["Enums"]["proposal_status"];

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  pedida: "Aguardando confirmação",
  confirmada: "Confirmada",
  realizada: "Realizada",
  nao_compareceu: "Não compareceu",
  cancelada: "Cancelada",
};
export const VISIT_STATUS_TONES: Record<VisitStatus, "warn" | "dark" | "ok" | "neutral" | "bad"> = {
  pedida: "warn",
  confirmada: "dark",
  realizada: "ok",
  nao_compareceu: "neutral",
  cancelada: "neutral",
};
export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  recebida: "Com o corretor",
  encaminhada: "Encaminhada ao proprietário",
  aceita: "Aceita",
  recusada: "Recusada",
  contraproposta: "Contraproposta",
};

export const TIMEZONE = "America/Fortaleza";
/** Fortaleza não tem horário de verão: sempre UTC−3. */
const OFFSET = "-03:00";

/** "sex, 30/10, 17h" (igual às mensagens do banco). */
export function formatVisitWhen(iso: string): string {
  const d = new Date(iso);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const weekday = String(parts.weekday).replace(".", "");
  const hour = String(Number(parts.hour));
  const time = parts.minute === "00" ? `${hour}h` : `${hour}h${parts.minute}`;
  return `${weekday}, ${parts.day}/${parts.month}, ${time}`;
}

/** Valor de um <input type="datetime-local"> (horário de Fortaleza) para ISO. Null se inválido. */
export function fromLocalInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00${OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO para o valor de um <input type="datetime-local"> no horário de Fortaleza. */
export function toLocalInput(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 3600_000);
  return d.toISOString().slice(0, 16);
}

type Slot = { id: string; brokerId: string | null; startsAt: string; durationMin: number; status: VisitStatus };

/** Visitas ativas (aguardando ou confirmadas) do mesmo corretor que se sobrepõem: "horário duplicado". */
export function conflictingIds(visits: Slot[]): Set<string> {
  const active = visits.filter((v) => (v.status === "pedida" || v.status === "confirmada") && v.brokerId);
  const out = new Set<string>();
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (a.brokerId !== b.brokerId) continue;
      const a0 = new Date(a.startsAt).getTime();
      const b0 = new Date(b.startsAt).getTime();
      if (a0 < b0 + b.durationMin * 60_000 && b0 < a0 + a.durationMin * 60_000) {
        out.add(a.id);
        out.add(b.id);
      }
    }
  }
  return out;
}

function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}
function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Arquivo de evento (.ics) para "Adicionar ao meu calendário". Abre no Google Agenda, no iPhone e no Outlook. */
export function buildIcs(e: { id: string; startsAt: string; durationMin: number; title: string; location: string | null; description: string }): string {
  const end = new Date(new Date(e.startsAt).getTime() + e.durationMin * 60_000).toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Konexya//Visitas//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:visita-${e.id}@konexya.com.br`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(e.startsAt)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(e.title)}`,
    ...(e.location ? [`LOCATION:${icsText(e.location)}`] : []),
    `DESCRIPTION:${icsText(e.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
