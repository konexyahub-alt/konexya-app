"use client";

import { useState, useTransition } from "react";
import { Button, HelpTip, Icon, Tag, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { parseBRNumber } from "@/lib/property-form";
import {
  PROPOSAL_STATUS_LABELS,
  VISIT_STATUS_LABELS,
  VISIT_STATUS_TONES,
  formatVisitWhen,
  fromLocalInput,
  type ProposalStatus,
  type VisitStatus,
} from "@/lib/visits";
import {
  answerProposal,
  closeVisit,
  confirmVisit,
  forwardProposal,
  registerProposal,
  rescheduleVisit,
  scheduleVisit,
  suggestVisitSlots,
} from "../actions";

export type StaffVisit = { id: string; startsAt: string; status: VisitStatus; propertyTitle: string; conflict: boolean };
export type StaffProposal = {
  id: string;
  amount: number;
  status: ProposalStatus;
  counterAmount: number | null;
  madeBy: "cliente" | "corretor";
  propertyTitle: string;
  askingPrice: number | null;
  createdAt: string;
};
type PropertyOption = { id: string; title: string; price: number | null };

const day = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" }).replace(":", "h");

function useRun() {
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>, ok: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.error) showToast(r.error);
      else {
        showToast(ok);
        after?.();
      }
    });
  return { pending, run };
}

/** P-04 · Visitas do lead: sugerir horários, marcar, confirmar (só o corretor, regra 4), remarcar e encerrar. */
export function VisitsPanel({
  leadId,
  visits,
  properties,
  disabled,
}: {
  leadId: string;
  visits: StaffVisit[];
  properties: PropertyOption[];
  disabled: boolean;
}) {
  const { pending, run } = useRun();
  const [mode, setMode] = useState<"none" | "suggest" | "schedule">("none");
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [slots, setSlots] = useState(["", "", ""]);
  const [moving, setMoving] = useState<string | null>(null);
  const [newAt, setNewAt] = useState("");
  const [now] = useState(() => Date.now());

  const active = visits.filter((v) => v.status === "pedida" || v.status === "confirmada");
  const past = visits.filter((v) => !(v.status === "pedida" || v.status === "confirmada"));

  return (
    <div className="grid gap-3">
      {active.length ? (
        <ul className="grid gap-2.5">
          {active.map((v) => {
            const started = new Date(v.startsAt).getTime() <= now;
            return (
              <li key={v.id} className={cn("grid gap-2 rounded-[14px] bg-paper p-3", v.conflict && "ring-1 ring-bad")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold">{formatVisitWhen(v.startsAt)}</p>
                    <p className="truncate text-[11.5px] text-muted">{v.propertyTitle}</p>
                  </div>
                  <Tag tone={v.conflict ? "bad" : VISIT_STATUS_TONES[v.status]}>{v.conflict ? "Horário duplicado" : VISIT_STATUS_LABELS[v.status]}</Tag>
                </div>
                {moving === v.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="datetime-local"
                      aria-label="Nova data e hora"
                      value={newAt}
                      onChange={(e) => setNewAt(e.target.value)}
                      className="min-h-11 min-w-0 flex-1 rounded-field border border-line-2 bg-white px-3 text-[13px]"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={pending}
                      onClick={() => {
                        const iso = fromLocalInput(newAt);
                        if (!iso) return;
                        run(() => rescheduleVisit(v.id, iso), "Visita remarcada. O cliente foi avisado.", () => setMoving(null));
                      }}
                    >
                      Salvar
                    </Button>
                    <button type="button" className="text-[12.5px] font-semibold underline" onClick={() => setMoving(null)}>
                      Voltar
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {v.status === "pedida" ? (
                      <Button size="sm" variant="secondary" disabled={disabled} loading={pending} onClick={() => run(() => confirmVisit(v.id), "Visita confirmada. O cliente foi avisado.")}>
                        Confirmar visita
                      </Button>
                    ) : null}
                    {v.status === "confirmada" && started ? (
                      <>
                        <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => closeVisit(v.id, "realizada"), "Visita marcada como realizada.")}>
                          Realizada
                        </Button>
                        <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => closeVisit(v.id, "nao_compareceu"), "Registrado: cliente não compareceu.")}>
                          Não compareceu
                        </Button>
                      </>
                    ) : null}
                    {!started ? (
                      <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setMoving(v.id)}>
                        Remarcar
                      </Button>
                    ) : null}
                    {v.status === "confirmada" ? (
                      <a href={`/api/visitas/${v.id}/calendario`} className="grid min-h-11 place-items-center px-1 text-[12.5px] font-semibold underline underline-offset-4">
                        Adicionar ao calendário
                      </a>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => closeVisit(v.id, "cancelada"), "Visita cancelada. O cliente foi avisado.")}
                      className="min-h-11 px-1 text-[12.5px] font-semibold text-muted underline underline-offset-4"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[12.5px] text-muted">Nenhuma visita marcada.</p>
      )}

      {past.length ? (
        <ul className="grid gap-1 text-[12px] text-muted">
          {past.map((v) => (
            <li key={v.id}>
              {formatVisitWhen(v.startsAt)} · {v.propertyTitle} · {VISIT_STATUS_LABELS[v.status]}
            </li>
          ))}
        </ul>
      ) : null}

      {!disabled && properties.length ? (
        mode === "none" ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setMode("suggest")}>
              Sugerir horários
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setMode("schedule")}>
              Marcar visita
            </Button>
          </div>
        ) : (
          <div className="grid gap-2.5 rounded-[14px] border border-line-2 p-3">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
              {mode === "suggest" ? "Sugerir até 3 horários" : "Marcar visita já confirmada"}
              <HelpTip label={mode === "suggest" ? "Sugerir horários" : "Marcar visita"}>
                {mode === "suggest"
                  ? "Os horários vão para a conversa como botões, em seu nome. O cliente escolhe um e a visita fica aguardando a sua confirmação."
                  : "Use quando você já combinou o horário com o cliente. A visita entra confirmada e o cliente é avisado."}
              </HelpTip>
            </p>
            <label className="grid gap-1 text-[12px] font-semibold">
              Imóvel
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="min-h-11 rounded-field border border-line-2 bg-white px-3 text-[13px] font-normal"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            {(mode === "suggest" ? [0, 1, 2] : [0]).map((i) => (
              <input
                key={i}
                type="datetime-local"
                aria-label={`Horário ${i + 1}`}
                value={slots[i]}
                onChange={(e) => setSlots(slots.map((s, j) => (j === i ? e.target.value : s)))}
                className="min-h-11 rounded-field border border-line-2 bg-white px-3 text-[13px]"
              />
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                loading={pending}
                onClick={() => {
                  const isos = (mode === "suggest" ? slots : slots.slice(0, 1)).map(fromLocalInput).filter((x): x is string => !!x);
                  const reset = () => {
                    setMode("none");
                    setSlots(["", "", ""]);
                  };
                  if (mode === "suggest") run(() => suggestVisitSlots(leadId, propertyId, isos), "Horários enviados ao cliente.", reset);
                  else run(() => scheduleVisit(leadId, propertyId, isos[0] ?? ""), "Visita marcada. O cliente foi avisado.", reset);
                }}
              >
                {mode === "suggest" ? "Enviar horários" : "Marcar"}
              </Button>
              <button type="button" className="min-h-11 text-[12.5px] font-semibold underline" onClick={() => setMode("none")}>
                Voltar
              </button>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}

/** P-04 · Proposta (regra 4): recebida → encaminhada ao proprietário → resposta. Nada vai ao proprietário pela Konexya. */
export function ProposalPanel({
  leadId,
  proposals,
  properties,
  disabled,
}: {
  leadId: string;
  proposals: StaffProposal[];
  properties: PropertyOption[];
  disabled: boolean;
}) {
  const { pending, run } = useRun();
  const [counter, setCounter] = useState("");
  const [registering, setRegistering] = useState(false);
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [value, setValue] = useState("");
  const current = proposals[0] ?? null;
  const older = proposals.slice(1);

  return (
    <div className="grid gap-3">
      {current ? (
        <div className="grid gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[24px] font-bold tracking-tight">{formatBRL(current.amount)}</p>
              <p className="text-[11.5px] text-muted">
                {current.madeBy === "cliente" ? "Feita pelo cliente no app" : "Registrada pela equipe"} · {day(current.createdAt)} · {current.propertyTitle}
                {current.askingPrice ? ` · pedido ${formatBRL(current.askingPrice)}` : ""}
              </p>
            </div>
            <Tag tone={current.status === "recebida" ? "dark" : current.status === "aceita" ? "ok" : current.status === "recusada" ? "bad" : "neutral"}>
              {current.status === "recebida" ? "Aguardando você" : PROPOSAL_STATUS_LABELS[current.status]}
            </Tag>
          </div>
          {current.status === "contraproposta" ? (
            <p className="text-[12.5px]">
              Contraproposta do proprietário: <b>{formatBRL(current.counterAmount)}</b>
            </p>
          ) : null}
          {current.status === "recebida" ? (
            <>
              <Button size="sm" fullWidth disabled={disabled} loading={pending} onClick={() => run(() => forwardProposal(current.id), "Marcada como encaminhada ao proprietário.")}>
                Encaminhar ao proprietário
              </Button>
              <p className="text-[11.5px] text-muted-2">A Konexya não envia nada ao proprietário: você encaminha pelo seu canal e marca aqui.</p>
            </>
          ) : null}
          {current.status === "encaminhada" ? (
            <div className="grid gap-2">
              <p className="text-[12px] font-semibold">Resposta do proprietário</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => answerProposal(current.id, "aceita"), "Resposta registrada: aceitou.")}>
                  Aceitou
                </Button>
                <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => answerProposal(current.id, "recusada"), "Resposta registrada: recusou.")}>
                  Recusou
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded-field border border-line-2 bg-white px-3 text-[13px]">
                  R$
                  <input
                    inputMode="numeric"
                    aria-label="Valor da contraproposta"
                    placeholder="Contraproposta"
                    value={counter}
                    onChange={(e) => setCounter(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent outline-none"
                  />
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={pending}
                  onClick={() => run(() => answerProposal(current.id, "contraproposta", parseBRNumber(counter) ?? undefined), "Contraproposta registrada.", () => setCounter(""))}
                >
                  Registrar contraproposta
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-[12.5px] text-muted">Nenhuma proposta ainda. O cliente pode fazer pelo app, ou você registra aqui.</p>
      )}

      {older.length ? (
        <ul className="grid gap-1 text-[12px] text-muted">
          {older.map((o) => (
            <li key={o.id}>
              {formatBRL(o.amount)} · {PROPOSAL_STATUS_LABELS[o.status]}
              {o.counterAmount ? ` (contra ${formatBRL(o.counterAmount)})` : ""}
            </li>
          ))}
        </ul>
      ) : null}

      {!disabled && properties.length && (!current || !["recebida", "encaminhada"].includes(current.status)) ? (
        registering ? (
          <div className="grid gap-2 rounded-[14px] border border-line-2 p-3">
            <select
              aria-label="Imóvel da proposta"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="min-h-11 rounded-field border border-line-2 bg-white px-3 text-[13px]"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <span className="flex min-h-11 items-center gap-1.5 rounded-field border border-line-2 bg-white px-3 text-[13px]">
              R$
              <input
                inputMode="numeric"
                aria-label="Valor da proposta"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                loading={pending}
                onClick={() =>
                  run(() => registerProposal(leadId, propertyId, parseBRNumber(value) ?? 0, ""), "Proposta registrada.", () => {
                    setRegistering(false);
                    setValue("");
                  })
                }
              >
                Registrar proposta
              </Button>
              <button type="button" className="min-h-11 text-[12.5px] font-semibold underline" onClick={() => setRegistering(false)}>
                Voltar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setRegistering(true)} className="flex min-h-11 w-fit items-center gap-1.5 text-[12.5px] font-semibold underline underline-offset-4">
            <Icon name="edit" size="sm" /> Registrar proposta do cliente
          </button>
        )
      ) : null}
    </div>
  );
}
