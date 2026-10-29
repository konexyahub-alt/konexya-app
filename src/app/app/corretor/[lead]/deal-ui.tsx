"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Button, Icon, Tag, buttonClasses, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { parseBRNumber } from "@/lib/property-form";
import { PROPOSAL_STATUS_LABELS, VISIT_STATUS_LABELS, VISIT_STATUS_TONES, formatVisitWhen, type ProposalStatus, type VisitStatus } from "@/lib/visits";
import { acceptCounter, cancelMyVisit, makeProposal, requestVisit } from "../../actions";

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
  /** O cliente aceitou a contraproposta; espera o corretor confirmar com o proprietário. */
  clientAcceptedAt: string | null;
};

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Fortaleza" }) : "";

/** A proposta pede uma ação do cliente (contraproposta ainda sem resposta dele). */
const needsClient = (p: ClientProposal) => p.status === "contraproposta" && !p.clientAcceptedAt;

function proposalLine(p: ClientProposal, broker: string): { title: string; sub: string } {
  if (p.status === "contraproposta" && p.clientAcceptedAt)
    return { title: `Você aceitou ${formatBRL(p.counterAmount)}`, sub: `Aguardando ${broker} confirmar com o proprietário` };
  if (p.status === "contraproposta") return { title: `Contraproposta: ${formatBRL(p.counterAmount)}`, sub: `Você ofereceu ${formatBRL(p.amount)} · responda ao corretor` };
  if (p.status === "recebida") return { title: `Sua proposta: ${formatBRL(p.amount)}`, sub: `Com ${broker}, que encaminha ao proprietário` };
  if (p.status === "encaminhada") return { title: `Sua proposta: ${formatBRL(p.amount)}`, sub: "Com o proprietário · aguardando resposta" };
  if (p.status === "aceita") return { title: "Proposta aceita", sub: `${broker} combina os próximos passos com você` };
  return { title: "Proposta recusada", sub: `Você ofereceu ${formatBRL(p.amount)} · pode fazer outra` };
}

/**
 * Topo da conversa: uma linha por assunto (visita e proposta), com o estado atual. A cor só aparece no que
 * pede ação do cliente. Tocar abre os detalhes numa folha.
 */
export function DealRows({
  visit,
  proposal,
  revoked,
  brokerName,
  askingPrice,
  onPropose,
}: {
  visit: ClientVisit | null;
  proposal: ClientProposal | null;
  revoked: boolean;
  brokerName: string;
  askingPrice: number | null;
  onPropose: () => void;
}) {
  const [open, setOpen] = useState<"visit" | "proposal" | null>(null);
  if (!visit && !proposal) return null;
  const row = "flex w-full items-center gap-3 rounded-[16px] bg-white px-3 py-2.5 text-left shadow-card";
  const line = proposal ? proposalLine(proposal, brokerName) : null;
  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
        {visit ? (
          <button type="button" className={row} onClick={() => setOpen("visit")}>
            <span className="grid size-8 flex-none place-items-center rounded-full bg-paper">
              <Icon name="cal" size="sm" />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-bold">{visit.status === "confirmada" ? "Visita confirmada" : "Visita aguardando confirmação"}</span>
              <span className="block truncate text-[11.5px] text-muted">
                {formatVisitWhen(visit.startsAt)}
                {visit.status === "confirmada" && visit.address ? ` · ${visit.address}` : ` · com ${brokerName}`}
              </span>
            </span>
            <Icon name="back" size="sm" className="rotate-180 text-muted-2" />
          </button>
        ) : null}
        {proposal && line ? (
          <button type="button" className={cn(row, needsClient(proposal) && !revoked && "ring-[1.5px] ring-warn")} onClick={() => setOpen("proposal")}>
            <span className="grid size-8 flex-none place-items-center rounded-full bg-paper text-[11px] font-bold">R$</span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-bold">{line.title}</span>
              <span className="block truncate text-[11.5px] text-muted">{line.sub}</span>
            </span>
            <Icon name="back" size="sm" className="rotate-180 text-muted-2" />
          </button>
        ) : null}
      </div>
      {open === "visit" && visit ? (
        <Sheet label="Visita" onClose={() => setOpen(null)}>
          <VisitDetail visit={visit} revoked={revoked} brokerName={brokerName} onDone={() => setOpen(null)} />
        </Sheet>
      ) : null}
      {open === "proposal" && proposal ? (
        <Sheet label="Proposta" onClose={() => setOpen(null)}>
          <ProposalDetail
            proposal={proposal}
            revoked={revoked}
            brokerName={brokerName}
            askingPrice={askingPrice}
            onPropose={() => {
              setOpen(null);
              onPropose();
            }}
            onClose={() => setOpen(null)}
          />
        </Sheet>
      ) : null}
    </>
  );
}

/** Folha de baixo para cima. Vai direto no <body>: o cabeçalho com desfoque prenderia um elemento "fixed". */
function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="grid max-h-[88dvh] w-full max-w-[430px] animate-toast-in gap-3.5 overflow-y-auto rounded-t-[28px] bg-white px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden className="mx-auto block h-[5px] w-10 rounded-full bg-line-2" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

function VisitDetail({ visit, revoked, brokerName, onDone }: { visit: ClientVisit; revoked: boolean; brokerName: string; onDone: () => void }) {
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const confirmed = visit.status === "confirmada";
  const [date, time] = [formatVisitWhen(visit.startsAt).split(", ").slice(0, 2).join(", "), formatVisitWhen(visit.startsAt).split(", ").at(-1)];
  return (
    <>
      <Tag tone={VISIT_STATUS_TONES[visit.status]} className="justify-self-start">
        {VISIT_STATUS_LABELS[visit.status]}
      </Tag>
      <p className="text-[24px] font-light tracking-tight">
        {date[0].toUpperCase() + date.slice(1)} · <b className="font-bold">{time}</b>
      </p>
      {confirmed && visit.address ? (
        <p className="flex items-center gap-2 text-[13px]">
          <Icon name="pin" size="sm" /> {visit.address}
        </p>
      ) : (
        <p className="text-[13px] text-muted">{brokerName} confirma o horário. Você recebe a confirmação aqui, com o endereço.</p>
      )}
      {!revoked ? (
        <>
          {confirmed ? (
            <a href={`/api/visitas/${visit.id}/calendario`} className={buttonClasses({ fullWidth: true })}>
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
                if (!r.error) onDone();
              })
            }
            className="min-h-touch text-sm font-semibold text-muted underline underline-offset-4"
          >
            Cancelar visita
          </button>
        </>
      ) : null}
    </>
  );
}

function ProposalDetail({
  proposal: p,
  revoked,
  brokerName,
  askingPrice,
  onPropose,
  onClose,
}: {
  proposal: ClientProposal;
  revoked: boolean;
  brokerName: string;
  askingPrice: number | null;
  onPropose: () => void;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const accepted = p.status === "contraproposta" && !!p.clientAcceptedAt;
  const counter = formatBRL(p.counterAmount);

  if (confirming) {
    return (
      <>
        <p className="text-[24px] font-light leading-tight tracking-tight">
          Aceitar <b className="whitespace-nowrap font-bold">{counter}</b>?
        </p>
        <p className="text-[13.5px]">
          Seu aceite vai para <b>{brokerName}</b>, que confirma com o proprietário e combina os próximos passos com você.
        </p>
        <p className="rounded-[14px] bg-paper p-3 text-[12.5px] text-muted">
          Aceitar aqui não é contrato nem pagamento. Documentos, sinal e financiamento são combinados com o corretor.
        </p>
        <Button
          fullWidth
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await acceptCounter(p.id);
              if (r.error) return showToast(r.error);
              showToast(`Aceite enviado para ${brokerName}.`);
              onClose();
            })
          }
        >
          Sim, aceitar {counter}
        </Button>
        <button type="button" onClick={() => setConfirming(false)} className="min-h-touch text-sm font-semibold underline underline-offset-4">
          Voltar
        </button>
      </>
    );
  }

  const answered = p.status === "aceita" || p.status === "recusada" || p.status === "contraproposta";
  const steps = [
    { on: true, text: `Você enviou ${formatBRL(p.amount)} ao corretor · ${day(p.createdAt)}` },
    { on: !!p.forwardedAt, text: p.forwardedAt ? `Corretor encaminhou ao proprietário · ${day(p.forwardedAt)}` : "Corretor encaminha ao proprietário" },
    {
      on: answered,
      strong: p.status === "contraproposta",
      text: answered
        ? p.status === "contraproposta" || (p.status !== "recusada" && p.counterAmount)
          ? `Proprietário respondeu: ${counter} · ${day(p.answeredAt)}`
          : `Proprietário ${p.status === "aceita" ? "aceitou" : "recusou"} · ${day(p.answeredAt)}`
        : "Resposta do proprietário",
    },
    ...(p.clientAcceptedAt ? [{ on: true, text: `Você aceitou ${counter} · ${day(p.clientAcceptedAt)}` }] : []),
  ];
  const tone = p.status === "aceita" ? "ok" : p.status === "recusada" ? "bad" : p.status === "contraproposta" ? "warn" : "neutral";
  const title =
    p.status === "contraproposta" && !accepted ? (
      <>
        O proprietário pediu <b className="whitespace-nowrap font-bold">{counter}</b>
      </>
    ) : accepted ? (
      <>
        Você aceitou <b className="whitespace-nowrap font-bold">{counter}</b>
      </>
    ) : p.status === "aceita" ? (
      <>
        Proposta <b className="font-bold">aceita</b>
      </>
    ) : (
      <>
        Sua proposta: <b className="whitespace-nowrap font-bold">{formatBRL(p.amount)}</b>
      </>
    );
  return (
    <>
      <Tag tone={tone} className="justify-self-start">
        {accepted ? "Aguardando o corretor" : PROPOSAL_STATUS_LABELS[p.status]}
      </Tag>
      <p className="text-[24px] font-light leading-tight tracking-tight">{title}</p>
      <p className="text-[12.5px] text-muted">
        {accepted
          ? `${brokerName} confirma com o proprietário e combina os próximos passos com você.`
          : p.status === "contraproposta"
            ? `Você ofereceu ${formatBRL(p.amount)}${askingPrice ? ` (pedido: ${formatBRL(askingPrice)})` : ""}.`
            : p.status === "aceita"
              ? `${brokerName} combina com você documentos, sinal e financiamento.`
              : p.status === "recusada"
                ? "O proprietário não aceitou. Você pode fazer outra proposta."
                : "Toda proposta passa primeiro pelo corretor, que encaminha ao proprietário."}
      </p>
      <ol className="grid gap-2 py-1">
        {steps.map((s) => (
          <li key={s.text} className="flex items-start gap-2.5 text-[12.5px]">
            <span aria-hidden className={cn("mt-0.5 size-3 flex-none rounded-full border-[1.5px]", s.on ? ("strong" in s && s.strong ? "border-warn bg-warn" : "border-black bg-black") : "border-line-2")} />
            <span className={cn(!s.on && "text-muted-2", "strong" in s && s.strong && "font-bold")}>{s.text}</span>
          </li>
        ))}
      </ol>
      {!revoked && p.status === "contraproposta" && !accepted ? (
        <>
          <Button fullWidth onClick={() => setConfirming(true)}>
            Aceitar {counter}
          </Button>
          <Button fullWidth variant="secondary" onClick={onPropose}>
            Fazer outra proposta
          </Button>
        </>
      ) : null}
      {!revoked && p.status === "recusada" ? (
        <Button fullWidth onClick={onPropose}>
          Fazer outra proposta
        </Button>
      ) : null}
      <button type="button" onClick={onClose} className="min-h-touch text-sm font-semibold underline underline-offset-4">
        Falar com {brokerName} na conversa
      </button>
    </>
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
