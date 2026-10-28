"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { RecommendationCard, type CardProperty, type CardReason } from "@/components/client/recommendation-card";
import { Button, Icon, TypingIndicator, YMark } from "@/components/ui";
import { CHAT_ERROR_TEXT, CHAT_LIMIT_TEXT } from "@/lib/chat-texts";
import { cn } from "@/lib/cn";
import { retryChat, sendChatMessage } from "./actions";

export type ChatMessage = {
  id: number;
  author: "cliente" | "ia" | "sistema";
  body: string;
  quickReplies: string[];
  cards: { property: CardProperty; score: number; reasons: CardReason[] }[];
};

type Props = {
  name: string;
  chips: { key: string; label: string; value: string | null }[];
  filled: number;
  messages: ChatMessage[];
  intro: { question: string; options: string[] } | null;
  pendingStep: string | null;
};

/** C-04 · Conversa. Uma pergunta por vez, respostas rápidas e campo livre sempre liberado. */
export function ChatView({ name, chips, filled, messages, intro, pendingStep }: Props) {
  const [pending, startTransition] = useTransition();
  const [optimistic, addOptimistic] = useOptimistic(messages, (state, body: string) => [
    ...state,
    { id: -Date.now(), author: "cliente" as const, body, quickReplies: [], cards: [] },
  ]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [optimistic.length, pending]);

  function send(body: string) {
    const value = body.trim();
    if (!value || pending) return;
    setText("");
    startTransition(async () => {
      addOptimistic(value);
      await sendChatMessage(value);
    });
  }

  function retry() {
    startTransition(async () => {
      await retryChat();
    });
  }

  const last = optimistic.at(-1);
  const quickReplies = pending ? [] : optimistic.length ? lastQuestionOptions(optimistic) : (intro?.options ?? []);
  const firstName = name.split(/\s+/)[0];

  return (
    <main className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 grid gap-3 bg-paper/95 px-5 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="grid size-[42px] flex-none place-items-center rounded-full bg-black text-white">
            <YMark className="h-5" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-bold">Konexya</p>
            <p className="text-[11.5px] text-muted">Toque nas opções ou escreva</p>
          </div>
        </div>
        <Link href="/app/perfil" className="grid gap-2" aria-label={`Seu perfil: ${filled} de ${chips.length} itens. Abrir o perfil`}>
          <span className="flex items-center justify-between">
            <span className="trk">Seu perfil</span>
            <span className="num text-[11.5px] font-bold">
              {filled} de {chips.length}
            </span>
          </span>
          <span className="grid grid-cols-9 gap-[3px]" aria-hidden>
            {chips.map((c) => (
              <i
                key={c.key}
                title={`${c.label}: ${c.value ?? "ainda não informado"}`}
                className={cn("h-1 rounded-full", c.value ? "bg-black" : "bg-line")}
              />
            ))}
          </span>
        </Link>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-[18px] pb-4 pt-3" aria-live="polite">
        {intro && !optimistic.length ? (
          <div className="grid gap-3 pb-4 pt-4">
            <h1 className="text-[28px] font-light leading-[1.22] tracking-tight">
              Oi, {firstName}.
              <br />
              Me conta como é a <b className="font-bold">sua rotina</b>.
            </h1>
            <p className="text-[12.5px] text-muted">
              Eu encontro os imóveis que combinam com ela. Sem filtros complicados.
            </p>
          </div>
        ) : null}
        {intro && !optimistic.length ? <Bubble author="ia">{intro.question}</Bubble> : null}

        {optimistic.map((m) => (
          <Message key={m.id} message={m} onRetry={retry} isLast={m === last} busy={pending} />
        ))}

        {pending ? <TypingIndicator label="Konexya está digitando" /> : null}

        {quickReplies.length ? (
          <div className="flex flex-col items-end gap-2 pt-1">
            {quickReplies.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => send(option)}
                className="min-h-[42px] rounded-full border-[1.5px] border-black bg-white px-4 text-[13px] font-semibold hover:bg-paper"
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-[calc(64px+max(10px,env(safe-area-inset-bottom)))] z-20 flex gap-2.5 bg-paper px-4 py-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <label className="sr-only" htmlFor="mensagem">
          Mensagem
        </label>
        <input
          id="mensagem"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1500}
          autoComplete="off"
          placeholder={pendingStep ? "Escreva do seu jeito…" : "Peça um ajuste, do seu jeito…"}
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
    </main>
  );
}

/** Respostas rápidas da última pergunta da IA (continuam valendo depois do aviso de limite). */
function lastQuestionOptions(list: ChatMessage[]): string[] {
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i];
    if (m.author === "cliente") return [];
    if (m.author === "ia" && m.quickReplies.length) return m.quickReplies;
  }
  return [];
}

function Message({
  message: m,
  onRetry,
  isLast,
  busy,
}: {
  message: ChatMessage;
  onRetry: () => void;
  isLast: boolean;
  busy: boolean;
}) {
  if (m.author === "sistema" && m.body === CHAT_ERROR_TEXT) {
    return (
      <div role="alert" className="grid w-fit max-w-[85%] gap-3 rounded-[20px] bg-white px-[15px] py-3.5 shadow-soft">
        <p className="text-sm">{m.body}</p>
        {isLast ? (
          <Button variant="secondary" size="sm" onClick={onRetry} disabled={busy} className="w-fit">
            <Icon name="refresh" size="sm" /> Tentar de novo
          </Button>
        ) : null}
      </div>
    );
  }
  if (m.author === "sistema" && m.body === CHAT_LIMIT_TEXT) {
    return (
      <div className="flex gap-3 rounded-[22px] bg-white p-4 text-[12.5px] shadow-card">
        <Icon name="clock" className="mt-0.5" />
        <p>
          Você usou as mensagens de hoje. <b>Amanhã a conversa continua.</b> As respostas rápidas seguem funcionando.
        </p>
      </div>
    );
  }
  if (m.author === "sistema") {
    return <p className="py-1 text-center text-[11px] tracking-wide text-muted-2">{m.body}</p>;
  }
  return (
    <>
      <Bubble author={m.author}>{m.body}</Bubble>
      {m.cards.map((c, i) => (
        <RecommendationCard key={c.property.id} property={c.property} score={c.score} reasons={c.reasons} compact={i >= 3} rank={m.cards.length > 1 ? i + 1 : undefined} />
      ))}
    </>
  );
}

function Bubble({ author, children }: { author: "cliente" | "ia"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "max-w-[85%] whitespace-pre-line rounded-[20px] px-[15px] py-3 text-sm",
        author === "cliente" ? "self-end bg-black text-white" : "self-start bg-white shadow-soft",
      )}
    >
      {children}
    </p>
  );
}
