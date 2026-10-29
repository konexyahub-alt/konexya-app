"use client";

import { useState, useTransition } from "react";
import { Button, Icon, Tag, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { parseBRNumber } from "@/lib/property-form";
import { PROPOSAL_STATUS_LABELS, VISIT_STATUS_LABELS, VISIT_STATUS_TONES, formatVisitWhen, type ProposalStatus, type VisitStatus } from "@/lib/visits";
import { cancelMyVisit, makeProposal, requestVisit } from "../../actions";

export type ClientVisit = {
  id: string;
  startsAt: string;
  status: VisitStatus;
  address: string | null;
};
export type ClientProposal = {
  id: string;
  amount: number;
  status: ProposalStatus;
  counterAmount: number | null;
  createdAt: string;
  forwardedAt: string | null;
  answeredAt: string | null;
};

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Fortaleza" }) : "";

/** Cartão fixo no topo da conversa: a próxima visita e a proposta em andamento. */
export function DealSummary({ visit, proposal, revoked }: { visit: ClientVisit | null; proposal: ClientProposal | null; revoked: boolean }) {
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  if (!visit && !proposal) return null;
  return (
    <div className="grid gap-2.5 border-t border-paper-2 pt-2.5">
      {visit ? (
        <div className="grid gap-1.5 text-[12px]">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Icon name="cal" size="sm" />
              <span>
                <b>{visit.status === "confirmada" ? "Visita confirmada" : "Visita pedida"}</b> · {formatVisitWhen(visit.startsAt)}
              </span>
            </span>
            {visit.status === "pedida" ? <Tag tone={VISIT_STATUS_TONES.pedida}>{VISIT_STATUS_LABELS.pedida}</Tag> : null}
          </div>
          {visit.status === "confirmada" && visit.address ? (
            <span className="flex items-center gap-2 text-muted">
              <Icon name="pin" size="sm" /> {visit.address}
            </span>
          ) : null}
          {!revoked ? (
            <span className="flex flex-wrap gap-4">
              {visit.status === "confirmada" ? (
                <a href={`/api/visitas/${visit.id}/calendario`} className="font-semibold underline underline-offset-4">
                  Adicionar ao meu calendário
                </a>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await cancelMyVisit(visit.id);
                    showToast(r.error ?? "Visita cancelada. O corretor foi avisado.");
                  })
                }
                className="font-semibold text-muted underline underline-offset-4"
              >
                Cancelar visita
              </button>
            </span>
          ) : null}
        </div>
      ) : null}
      {proposal ? <ProposalProgress proposal={proposal} /> : null}
    </div>
  );
}

function ProposalProgress({ proposal: p }: { proposal: ClientProposal }) {
  const answered = p.status === "aceita" || p.status === "recusada" || p.status === "contraproposta";
  const steps = [
    { on: true, text: `Enviada ao corretor · ${day(p.createdAt)}` },
    { on: !!p.forwardedAt, text: p.forwardedAt ? `Encaminhada ao proprietário · ${day(p.forwardedAt)}` : "Encaminhada ao proprietário" },
    {
      on: answered,
      text: answered
        ? p.status === "contraproposta"
          ? `Contraproposta: ${formatBRL(p.counterAmount)} · ${day(p.answeredAt)}`
          : `${p.status === "aceita" ? "Aceita" : "Recusada"} pelo proprietário · ${day(p.answeredAt)}`
        : "Resposta do proprietário",
    },
  ];
  const tone = p.status === "aceita" ? "ok" : p.status === "recusada" ? "bad" : p.status === "contraproposta" ? "warn" : "neutral";
  return (
    <div className="grid gap-2 text-[12px]">
      <div className="flex items-center justify-between gap-2">
        <span>
          <b>Sua proposta</b> · {formatBRL(p.amount)}
        </span>
        <Tag tone={tone}>{PROPOSAL_STATUS_LABELS[p.status]}</Tag>
      </div>
      <ol className="grid gap-1.5">
        {steps.map((s) => (
          <li key={s.text} className="flex items-center gap-2">
            <span aria-hidden className={cn("size-3.5 flex-none rounded-full border-[1.5px]", s.on ? "border-black bg-black" : "border-line-2")} />
            <span className={s.on ? "" : "text-muted-2"}>{s.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Botões de horário dentro da mensagem do corretor. Escolher cria a visita "aguardando confirmação". */
export function SlotButtons({
  messageId,
  labels,
  slots,
  taken,
  disabled,
}: {
  messageId: number;
  labels: string[];
  slots: string[];
  taken: string[];
  disabled: boolean;
}) {
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [now] = useState(() => Date.now());
  return (
    <div className="flex flex-wrap gap-2 pl-1">
      {slots.map((iso, i) => {
        const past = new Date(iso).getTime() < now;
        const chosen = taken.includes(iso);
        return (
          <button
            key={iso}
            type="button"
            disabled={disabled || pending || past || chosen}
            onClick={() =>
              start(async () => {
                const r = await requestVisit(messageId, i);
                showToast(r.error ?? "Horário enviado. Agora é só o corretor confirmar.");
              })
            }
            className={cn(
              "min-h-[42px] rounded-full border-[1.5px] px-4 text-[13px] font-semibold",
              chosen ? "border-black bg-black text-white" : "border-black bg-white hover:bg-paper",
              (past || disabled) && !chosen && "border-line-2 text-muted-2",
            )}
          >
            {labels[i] ?? formatVisitWhen(iso)}
          </button>
        );
      })}
    </div>
  );
}

/** "Fazer proposta": o valor vai primeiro ao corretor, que confere e encaminha ao proprietário (regra 4). */
export function ProposalSheet({
  leadId,
  propertyId,
  propertyTitle,
  askingPrice,
  brokerName,
  onClose,
}: {
  leadId: string;
  propertyId: string;
  propertyTitle: string;
  askingPrice: number | null;
  brokerName: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(askingPrice ? formatBRL(askingPrice)?.replace(/^R\$\s?/, "") ?? "" : "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const amount = parseBRNumber(value);
  const diff = amount && askingPrice ? Math.round((1 - amount / askingPrice) * 100) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55" role="presentation" onClick={() => !pending && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposta-titulo"
        className="grid w-full max-w-[430px] animate-toast-in gap-4 rounded-t-[28px] bg-white px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden className="mx-auto block h-[5px] w-10 rounded-full bg-line-2" />
        <span className="trk">Proposta · {propertyTitle}</span>
        <h2 id="proposta-titulo" className="text-[22px] font-light leading-tight tracking-tight">
          Quanto você quer <b className="font-bold">oferecer</b>?
        </h2>
        <label className="grid gap-1.5 text-[12.5px] font-semibold">
          Valor da proposta
          <span className="flex items-center gap-2 rounded-field border-[1.5px] border-line-2 bg-white px-3.5 focus-within:border-black">
            <span className="text-base font-bold">R$</span>
            <input
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="min-h-touch w-full min-w-0 bg-transparent text-xl font-bold outline-none"
            />
          </span>
          {askingPrice ? (
            <span className="font-medium text-muted">
              Pedido: {formatBRL(askingPrice)}
              {diff !== null && diff !== 0 ? ` · ${Math.abs(diff)}% ${diff > 0 ? "abaixo" : "acima"}` : ""}
            </span>
          ) : null}
        </label>
        <label className="grid gap-1.5 text-[12.5px] font-semibold">
          Forma de pagamento (opcional)
          <input
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: financiamento com FGTS"
            className="min-h-touch w-full min-w-0 rounded-field border-[1.5px] border-line-2 bg-white px-3.5 text-base font-medium outline-none focus:border-black"
          />
        </label>
        <p className="flex gap-2 rounded-[14px] bg-paper p-3 text-[12px] text-muted">
          <Icon name="info" size="sm" className="mt-px flex-none" />
          A proposta vai primeiro para {brokerName}, que confere e encaminha ao proprietário. Você acompanha a resposta aqui.
        </p>
        {error ? (
          <p role="alert" className="text-[12.5px] font-semibold text-bad">
            {error}
          </p>
        ) : null}
        <Button
          fullWidth
          loading={pending}
          disabled={!amount}
          onClick={() =>
            start(async () => {
              setError(undefined);
              const r = await makeProposal(leadId, propertyId, amount ?? 0, note);
              if (r.error) return setError(r.error);
              showToast("Proposta enviada ao corretor.");
              onClose();
            })
          }
        >
          Enviar proposta ao corretor
        </Button>
        <button type="button" onClick={onClose} disabled={pending} className="min-h-touch text-sm font-semibold underline underline-offset-4">
          Agora não
        </button>
      </div>
    </div>
  );
}
