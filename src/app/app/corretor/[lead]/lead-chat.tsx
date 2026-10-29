"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { HelpTip, Icon, ScoreRing, TypingIndicator, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { sendLeadMessage } from "../../actions";
import { DealRows, ProposalSheet, SlotButtons, type ClientProposal, type ClientVisit } from "./deal-ui";

type Message = {
  id: number;
  sender: "cliente" | "corretor" | "assistente" | "sistema";
  body: string;
  quickReplies: string[];
  /** Horários de visita sugeridos pelo corretor (ISO), quando a mensagem traz botões de horário. */
  slots?: string[] | null;
  at: string;
};

type Props = {
  leadId: string;
  agencyId: string;
  agencyName: string;
  brokerLine: string;
  assistantName: string;
  assistantActive: boolean;
  revoked: boolean;
  sharedAt: string | null;
  property: { id: string; title: string; line: string; photoUrl: string | null; score: number | null; price: number | null } | null;
  messages: Message[];
  visit: ClientVisit | null;
  takenSlots: string[];
  proposal: ClientProposal | null;
};

const POLL_MS = 5000;

/** C-11 · Conversa do cliente com a imobiliária. Atualiza sozinha enquanto a tela está aberta. */
export function LeadChat(props: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [proposing, setProposing] = useState(false);
  const [optimistic, add] = useOptimistic(props.messages, (state, body: string) => [
    ...state,
    { id: -Date.now(), sender: "cliente" as const, body, quickReplies: [], at: new Date().toISOString() },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [router]);

  useEffect(() => {
    // Rola até o fim da página: alinhar só a última mensagem a deixaria atrás do campo de mensagem fixo.
    if (endRef.current) window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [optimistic.length, pending]);

  function send(body: string) {
    const value = body.trim();
    if (!value || pending) return;
    setText("");
    start(async () => {
      add(value);
      const r = await sendLeadMessage(props.leadId, value);
      if (r.error) showToast(r.error);
    });
  }

  const brokerName = props.brokerLine.startsWith("Corretor(a) ") ? props.brokerLine.replace(/^Corretor\(a\) /, "") : "o corretor";
  const last = optimistic.at(-1);
  const quick =
    !pending && props.assistantActive && last?.sender === "assistente" ? last.quickReplies : [];
  const sharedTime = props.sharedAt
    ? new Date(props.sharedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" })
    : null;

  return (
    <main className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)] gap-3 bg-paper/95 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-3 px-1">
          <Link href="/app/corretor" aria-label="Voltar para as conversas" className="grid size-10 place-items-center rounded-full">
            <Icon name="back" />
          </Link>
          <span className="grid size-[42px] flex-none place-items-center rounded-full bg-black text-[11.5px] font-bold text-white">
            {initials(props.agencyName)}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15.5px] font-bold">{props.agencyName}</p>
            <p className="truncate text-[11.5px] text-muted">
              {props.brokerLine}
            </p>
          </div>
        </div>
        {props.property ? (
          <Link
            href={`/app/imoveis/${props.property.id}`}
            className="flex items-center gap-3 rounded-[18px] bg-white p-2.5 shadow-card"
          >
            {props.property.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.property.photoUrl} alt="" className="size-[52px] flex-none rounded-xl object-cover" />
            ) : (
              <span className="grid size-[52px] flex-none place-items-center rounded-xl bg-paper-2 text-muted-2">
                <Icon name="home" />
              </span>
            )}
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[12.5px] font-bold">{props.property.title}</span>
              <span className="block truncate text-[11.5px] text-muted">{props.property.line}</span>
            </span>
            {props.property.score !== null ? <ScoreRing score={props.property.score} size={42} /> : null}
          </Link>
        ) : null}
        <DealRows
          visit={props.visit}
          proposal={props.proposal}
          revoked={props.revoked}
          brokerName={brokerName}
          askingPrice={props.property?.price ?? null}
          onPropose={() => setProposing(true)}
        />
      </header>

      <div className="flex flex-1 flex-col gap-2.5 px-[18px] pb-4 pt-3" aria-live="polite">
        {sharedTime ? (
          <p className="py-1 text-center text-[11px] uppercase tracking-wide text-muted-2">
            Você compartilhou seu perfil · {sharedTime.replace(":", "h")}
          </p>
        ) : null}
        {optimistic.map((m) => (
          <div key={m.id} className="contents">
            <Bubble m={m} assistantName={props.assistantName} brokerLine={props.brokerLine} />
            {m.slots?.length ? (
              <SlotButtons
                messageId={m.id}
                labels={m.quickReplies}
                slots={m.slots}
                taken={props.takenSlots}
                disabled={props.revoked}
              />
            ) : null}
          </div>
        ))}
        {pending && props.assistantActive ? <TypingIndicator label={`${props.assistantName} está digitando`} /> : null}
        {quick.length ? (
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {quick.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="min-h-[42px] rounded-full border-[1.5px] border-black bg-white px-4 text-[13px] font-semibold hover:bg-paper"
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {props.revoked ? (
        <div className="sticky bottom-[calc(64px+max(10px,env(safe-area-inset-bottom)))] mx-4 mb-3 rounded-[18px] bg-black p-4 text-[13px] text-white">
          Você revogou o compartilhamento com esta imobiliária. A conversa está encerrada e novos dados não são enviados.
        </div>
      ) : (
        <div className="sticky bottom-[calc(64px+max(10px,env(safe-area-inset-bottom)))] z-20 bg-paper pt-2">
        {props.property && !props.proposal ? (
          <div className="flex justify-end px-4">
            <button
              type="button"
              onClick={() => setProposing(true)}
              className="min-h-9 rounded-full border border-line-2 bg-white px-3.5 text-[12.5px] font-semibold hover:border-black"
            >
              Fazer proposta
            </button>
          </div>
        ) : null}
        <form
          className="flex gap-2.5 px-4 py-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <label htmlFor="mensagem-corretor" className="sr-only">
            Mensagem
          </label>
          <input
            id="mensagem-corretor"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            autoComplete="off"
            placeholder="Escreva uma mensagem…"
            className="h-[50px] min-w-0 flex-1 rounded-full bg-white px-[18px] text-sm shadow-[0_1px_2px_rgb(11_11_12/0.08)] outline-none placeholder:text-muted-2 focus-visible:outline-2 focus-visible:outline-black"
          />
          <button
            type="submit"
            aria-label="Enviar"
            disabled={!text.trim() || pending}
            className="grid size-[50px] flex-none place-items-center rounded-full bg-black text-white disabled:opacity-40"
          >
            <Icon name="send" />
          </button>
        </form>
        </div>
      )}
      {proposing && props.property ? (
        <ProposalSheet
          leadId={props.leadId}
          propertyId={props.property.id}
          propertyTitle={props.property.title}
          askingPrice={props.property.price}
          brokerName={brokerName}
          onClose={() => setProposing(false)}
        />
      ) : null}
    </main>
  );
}

function Bubble({ m, assistantName, brokerLine }: { m: Message; assistantName: string; brokerLine: string }) {
  if (m.sender === "sistema") {
    return <p className="py-1 text-center text-[11.5px] text-muted-2">{m.body}</p>;
  }
  if (m.sender === "cliente") {
    return <p className="max-w-[85%] self-end whitespace-pre-line rounded-[20px] bg-black px-[15px] py-3 text-sm text-white">{m.body}</p>;
  }
  const isAssistant = m.sender === "assistente";
  return (
    <div
      className={cn(
        "grid max-w-[85%] gap-1.5 self-start rounded-[20px] bg-white px-[15px] py-3",
        isAssistant ? "shadow-soft" : "border-[1.5px] border-black",
      )}
    >
      <p className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-bold">
        {isAssistant ? assistantName : brokerLine.replace(/^Corretor\(a\) /, "")}
        {isAssistant ? (
          <>
            <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]">
              Assistente virtual
            </span>
            <HelpTip label="Assistente virtual">
              Uma assistente automática da imobiliária, não uma pessoa. Ela faz algumas perguntas rápidas e responde
              com os dados do anúncio. Preço, visita, financiamento e opiniões ficam com o corretor, que assume a
              conversa quando enviar a primeira mensagem.
            </HelpTip>
          </>
        ) : null}
      </p>
      <p className="whitespace-pre-line text-[13.5px]">{m.body}</p>
    </div>
  );
}
