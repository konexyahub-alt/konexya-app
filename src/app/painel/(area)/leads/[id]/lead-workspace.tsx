"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, HelpTip, Icon, ScoreRing, Tag, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { CLOSED_STAGES, LOST_REASON_LABELS, OPEN_STAGES, STAGE_LABELS, type LeadStage, type LostReason } from "@/lib/leads";
import { READINESS_LABELS, type Readiness } from "@/lib/readiness";
import { addNote, approveSuggestion, assignBroker, discardSuggestion, moveStage, sendBrokerMessage, suggestReply } from "../actions";

type Props = {
  lead: {
    id: string;
    clientName: string;
    stage: LeadStage;
    brokerId: string | null;
    sharedAt: string;
    revoked: boolean;
    summary: string | null;
    assistantActive: boolean;
    firstResponseAt: string | null;
    createdAt: string;
  };
  readiness: Readiness;
  qualification: { label: string; value: string | null; fresh: boolean }[];
  customAnswers: { question: string; answer: string; fresh: boolean }[];
  questions: { id: string; body: string; open: boolean }[];
  properties: {
    id: string;
    title: string;
    neighborhood: string | null;
    price: number | null;
    photoUrl: string | null;
    score: number | null;
    reasons: { band: string; text: string }[];
    interest: boolean;
    saved: boolean;
    viewed: boolean;
  }[];
  messages: { id: number; sender: "cliente" | "corretor" | "assistente" | "sistema"; author: string | null; body: string; at: string }[];
  suggestion: { id: string; body: string } | null;
  notes: { id: string; author: string; body: string; at: string }[];
  team: { id: string; name: string }[];
  canAssign: boolean;
  me: string;
  assistantName: string;
};

const POLL_MS = 8000;
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" }).replace(":", "h");
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" });

/** P-04 · Lead aberto: 3 colunas no computador; no celular, abas Conversa, Perfil e Próximos passos. */
export function LeadWorkspace(p: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"conversa" | "perfil" | "passos">("conversa");

  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [router]);

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-paper-2 bg-white px-4 py-3 lg:px-7">
        <Link href="/painel/funil" aria-label="Voltar para o funil" className="grid size-10 place-items-center rounded-full hover:bg-paper">
          <Icon name="back" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="trk">Lead aberto</p>
          <h1 className="truncate text-xl font-bold">{p.lead.clientName}</h1>
        </div>
        <Tag tone={p.lead.revoked ? "bad" : "neutral"}>{p.lead.revoked ? "Consentimento revogado" : STAGE_LABELS[p.lead.stage]}</Tag>
      </header>

      <nav className="flex gap-1 border-b border-paper-2 bg-white px-3 lg:hidden" aria-label="Seções do lead">
        {(
          [
            ["conversa", "Conversa"],
            ["perfil", "Perfil"],
            ["passos", "Próximos passos"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            aria-current={tab === k ? "page" : undefined}
            className={cn("min-h-touch flex-1 border-b-2 text-[13px] font-semibold", tab === k ? "border-black" : "border-transparent text-muted")}
          >
            {label}
          </button>
        ))}
      </nav>

      {/*
        Até 1535 px (tablet e notebook): duas colunas, perfil e próximos passos empilhados à esquerda e a conversa
        larga à direita. A partir de 1536 px: três colunas lado a lado. Assim a conversa nunca fica espremida.
      */}
      <div className="grid flex-1 content-start gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:p-6 2xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)_minmax(260px,320px)]">
        <div className={cn("grid min-w-0 content-start gap-4 lg:col-start-1 lg:row-start-1", tab !== "perfil" && "hidden lg:grid")}>
          <ProfileColumn {...p} />
        </div>
        <div
          className={cn(
            "min-w-0 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start 2xl:row-span-1",
            tab !== "conversa" && "hidden lg:block",
          )}
        >
          <ConversationColumn {...p} />
        </div>
        <div
          className={cn(
            "grid min-w-0 content-start gap-4 lg:col-start-1 lg:row-start-2 2xl:col-start-3 2xl:row-start-1",
            tab !== "passos" && "hidden lg:grid",
          )}
        >
          <NextStepsColumn {...p} />
        </div>
      </div>
    </main>
  );
}

function Panel({
  title,
  help,
  children,
  className,
}: {
  title?: string;
  help?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-3 rounded-[20px] bg-white p-[18px] shadow-soft", className)}>
      {title ? (
        <h2 className="trk flex items-center gap-1.5">
          {title}
          {help ? <HelpTip label={title}>{help}</HelpTip> : null}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

function ProfileColumn(p: Props) {
  return (
    <>
      <Panel>
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-black text-sm font-bold text-white">
            {p.lead.clientName.slice(0, 1).toUpperCase()}
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-bold">{p.lead.clientName}</p>
            <p className="text-[11.5px] text-muted">Konexya · autorizou em {fmt(p.lead.sharedAt)}</p>
          </div>
        </div>
        {p.lead.summary ? (
          <p className="text-[13px] leading-relaxed">{p.lead.summary}</p>
        ) : (
          <p className="text-[12.5px] text-muted">O resumo da IA aparece aqui em instantes. Enquanto isso, veja a qualificação abaixo.</p>
        )}
      </Panel>

      <Panel
        title="Qualificação"
        help="O que já se sabe para atender este cliente. Vem do perfil dele e das respostas à assistente virtual. “A confirmar” é o que ainda falta perguntar."
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
            Prontidão
            <HelpTip label="Prontidão">
              Calculada pelo que o próprio cliente informou. Pronto para visitar: quer mudar em até 3 meses e informou o
              orçamento. Pesquisando: até 6 meses, ou 3 meses sem orçamento. Curioso: sem prazo definido.
            </HelpTip>
          </span>
          <Tag tone={p.readiness === "pronto_para_visitar" ? "ok" : p.readiness === "pesquisando" ? "warn" : "neutral"}>
            {READINESS_LABELS[p.readiness]}
          </Tag>
        </div>
        <ul className="grid gap-2">
          {p.qualification.map((q) => (
            <li key={q.label} className="flex items-start justify-between gap-3 text-[12.5px]">
              <span className="flex items-center gap-2">
                <Icon name={q.value ? "check" : "clock"} size="sm" className={q.value ? "text-ok" : "text-muted-2"} />
                {q.label}
              </span>
              <span className={cn("text-right font-semibold", !q.value && "font-normal text-muted-2")}>
                {q.value ?? "A confirmar"}
                {q.fresh ? <Tag tone="dark" className="ml-1.5 align-middle">Agora</Tag> : null}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      {p.customAnswers.length ? (
        <Panel title="Respostas para a imobiliária">
          <ul className="grid gap-2.5">
            {p.customAnswers.map((a, i) => (
              <li key={i} className="grid gap-0.5 text-[12.5px]">
                <span className="text-muted">{a.question}</span>
                <span className="font-semibold">
                  {a.answer}
                  {a.fresh ? <Tag tone="dark" className="ml-1.5 align-middle">Agora</Tag> : null}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {p.questions.length ? (
        <Panel title="Dúvidas do cliente">
          <ul className="grid gap-2">
            {p.questions.map((q) => (
              <li key={q.id} className="flex items-start gap-2 text-[12.5px]">
                <Icon name={q.open ? "alert" : "check"} size="sm" className={q.open ? "text-warn" : "text-ok"} />
                <span>
                  {q.body}
                  <span className="block text-[11px] text-muted-2">{q.open ? "Aguardando sua resposta" : "Respondida"}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel title="Imóveis vistos e salvos">
        {p.properties.length ? (
          <ul className="grid gap-3">
            {p.properties.map((x) => (
              <li key={x.id} className="flex items-center gap-3">
                {x.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={x.photoUrl} alt="" className="size-12 flex-none rounded-xl object-cover" />
                ) : (
                  <span className="grid size-12 flex-none place-items-center rounded-xl bg-paper-2 text-muted-2">
                    <Icon name="home" size="sm" />
                  </span>
                )}
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[12.5px] font-bold">{x.title}</p>
                  <p className="truncate text-[11px] text-muted">
                    {[x.neighborhood, formatBRL(x.price)].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-[11px] text-muted-2">
                    {[x.interest && "Interesse", x.saved && "Salvo", x.viewed && "Visto"].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {x.score !== null ? <ScoreRing score={x.score} size={40} /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12.5px] text-muted">Nenhum imóvel desta imobiliária visto ou salvo.</p>
        )}
      </Panel>
    </>
  );
}

function ConversationColumn(p: Props) {
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [p.messages.length]);

  const run = (fn: () => Promise<{ error?: string }>, ok?: string) =>
    start(async () => {
      const r = await fn();
      if (r.error) showToast(r.error);
      else if (ok) showToast(ok);
    });
  const first = p.lead.clientName.split(/\s+/)[0];

  return (
    <section className="flex min-h-[560px] flex-col overflow-hidden rounded-[20px] bg-white shadow-soft lg:h-[calc(100dvh-140px)]">
      <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
        {p.messages.map((m) =>
          m.sender === "sistema" ? (
            <p key={m.id} className="py-1 text-center text-[11px] text-muted-2">
              {m.body} · {time(m.at)}
            </p>
          ) : (
            <div
              key={m.id}
              className={cn(
                "grid max-w-[80%] gap-1 rounded-[18px] px-3.5 py-2.5 text-[13px]",
                m.sender === "cliente" && "bg-paper",
                m.sender === "corretor" && "ml-auto bg-black text-white",
                m.sender === "assistente" && "border border-line",
              )}
            >
              <span className={cn("flex items-center gap-1.5 text-[11px] font-bold", m.sender === "corretor" ? "text-white/70" : "text-muted")}>
                {m.sender === "cliente" ? first : m.sender === "corretor" ? m.author : p.assistantName}
                {m.sender === "assistente" ? (
                  <span className="rounded-full bg-paper-2 px-1.5 py-px text-[9.5px] uppercase tracking-[0.06em] text-ink">
                    Assistente virtual
                  </span>
                ) : null}
                <span className="font-normal">{time(m.at)}</span>
              </span>
              <span className="whitespace-pre-line">{m.body}</span>
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      {p.lead.revoked ? (
        <p className="border-t border-paper-2 p-4 text-[12.5px] text-muted">
          O cliente revogou o compartilhamento. A conversa está encerrada e novos dados não chegam mais.
        </p>
      ) : (
        <div className="grid gap-3 border-t border-paper-2 p-4">
          {p.suggestion ? (
            <div className="grid gap-2.5 rounded-[16px] border-[1.5px] border-black p-3.5">
              <div className="flex items-center gap-2">
                <Tag tone="dark">Aguardando você</Tag>
                <span className="text-[11.5px] text-muted">Mensagem sugerida pela IA. Nada sai sem você.</span>
              </div>
              {editing !== null ? (
                <textarea
                  aria-label="Editar a mensagem sugerida"
                  value={editing}
                  onChange={(e) => setEditing(e.target.value)}
                  rows={5}
                  className="w-full rounded-field border border-line-2 p-3 text-[13px]"
                />
              ) : (
                <p className="whitespace-pre-line text-[13px]">{p.suggestion.body}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {editing !== null ? (
                  <>
                    <Button size="sm" loading={pending} onClick={() => run(() => approveSuggestion(p.suggestion!.id, editing), "Mensagem enviada.")}>
                      Enviar editada
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" loading={pending} onClick={() => run(() => approveSuggestion(p.suggestion!.id), "Mensagem enviada.")}>
                      Aprovar e enviar
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(p.suggestion!.body)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => discardSuggestion(p.suggestion!.id))}>
                      Descartar
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : null}

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const value = text;
              run(async () => {
                const r = await sendBrokerMessage(p.lead.id, value);
                if (!r.error) setText("");
                return r;
              }, "Mensagem enviada.");
            }}
          >
            <label htmlFor="msg-corretor" className="sr-only">
              Escrever para {first}
            </label>
            <textarea
              id="msg-corretor"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder={`Escreva para ${first}…`}
              className="min-h-touch flex-1 resize-none rounded-field border border-line-2 p-3 text-[13px]"
            />
            <button
              type="submit"
              aria-label="Enviar mensagem"
              disabled={!text.trim() || pending}
              className="grid size-touch flex-none place-items-center self-end rounded-full border-[1.5px] border-black disabled:opacity-40"
            >
              <Icon name="send" />
            </button>
          </form>
          {!p.suggestion ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => suggestReply(p.lead.id))}
              className="min-h-touch w-fit text-[12.5px] font-semibold underline underline-offset-4 disabled:opacity-40"
            >
              {pending ? "Pensando…" : "Sugerir resposta com IA"}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function nextAction(p: Props): string {
  if (p.lead.revoked) return "O cliente revogou o compartilhamento. Não envie mais mensagens.";
  if (!p.lead.firstResponseAt) return p.suggestion ? "Revisar e aprovar a primeira mensagem." : "Enviar a primeira mensagem.";
  if (p.questions.some((q) => q.open)) return "Responder as dúvidas do cliente.";
  const last = p.messages.filter((m) => m.sender !== "sistema").at(-1);
  if (last?.sender === "cliente") return "Responder a última mensagem do cliente.";
  return "Aguardar a resposta do cliente.";
}

function NextStepsColumn(p: Props) {
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [lost, setLost] = useState<{ reason: LostReason | null; note: string } | null>(null);
  const [note, setNote] = useState("");
  const run = (fn: () => Promise<{ error?: string }>, ok: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.error) showToast(r.error);
      else {
        showToast(ok);
        after?.();
      }
    });
  const responseMs = p.lead.firstResponseAt ? new Date(p.lead.firstResponseAt).getTime() - new Date(p.lead.createdAt).getTime() : null;

  return (
    <>
      <Panel title="Próxima ação">
        <p className="text-[14px] font-semibold">{nextAction(p)}</p>
        {responseMs !== null ? (
          <p className="text-[11.5px] text-muted">Primeira resposta em {Math.max(1, Math.round(responseMs / 60000))} min.</p>
        ) : null}
        {p.lead.assistantActive ? (
          <p className="text-[11.5px] text-muted">
            {p.assistantName} (assistente virtual) está fazendo as perguntas configuradas. Ela para quando você enviar a primeira mensagem.
          </p>
        ) : null}
      </Panel>

      <Panel title="Etapa do funil">
        <label className="sr-only" htmlFor="etapa">
          Etapa
        </label>
        <select
          id="etapa"
          value={p.lead.stage}
          disabled={pending || p.lead.revoked}
          onChange={(e) => {
            const stage = e.target.value as LeadStage;
            if (stage === "perdido") setLost({ reason: null, note: "" });
            else run(() => moveStage(p.lead.id, stage), `Lead movido para ${STAGE_LABELS[stage]}.`);
          }}
          className="h-12 rounded-field border border-line-2 bg-white px-3 text-[13px] font-semibold"
        >
          {[...OPEN_STAGES, ...CLOSED_STAGES].map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        {lost ? (
          <div className="grid gap-2 rounded-[14px] bg-paper p-3">
            <p className="text-[12.5px] font-semibold">Por que o lead foi perdido?</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(LOST_REASON_LABELS) as LostReason[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setLost({ ...lost, reason: r })}
                  className={cn("min-h-9 rounded-full border px-3 text-xs font-semibold", lost.reason === r ? "border-black bg-black text-white" : "border-line-2 bg-white")}
                >
                  {LOST_REASON_LABELS[r]}
                </button>
              ))}
            </div>
            <input
              aria-label="Observação (opcional)"
              placeholder="Observação (opcional)"
              value={lost.note}
              onChange={(e) => setLost({ ...lost, note: e.target.value })}
              maxLength={300}
              className="h-11 rounded-field border border-line-2 bg-white px-3 text-[12.5px]"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={!lost.reason}
                loading={pending}
                onClick={() => run(() => moveStage(p.lead.id, "perdido", lost.reason, lost.note), "Lead marcado como perdido.", () => setLost(null))}
              >
                Marcar como perdido
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setLost(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>

      <Panel title="Corretor responsável">
        {p.canAssign ? (
          <select
            aria-label="Corretor responsável"
            value={p.lead.brokerId ?? ""}
            disabled={pending}
            onChange={(e) => e.target.value && run(() => assignBroker(p.lead.id, e.target.value), "Responsável atualizado.")}
            className="h-12 rounded-field border border-line-2 bg-white px-3 text-[13px] font-semibold"
          >
            <option value="">Sem responsável</option>
            {p.team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-[13px] font-semibold">{p.team.find((m) => m.id === p.lead.brokerId)?.name ?? "Sem responsável"}</p>
        )}
      </Panel>

      <Panel title="Anotações internas">
        <p className="text-[11.5px] text-muted">Só a equipe vê.</p>
        {p.notes.map((n) => (
          <div key={n.id} className="grid gap-0.5 rounded-[12px] bg-paper p-2.5 text-[12.5px]">
            <span className="text-[11px] text-muted">
              {n.author} · {fmt(n.at)}
            </span>
            <span className="whitespace-pre-line">{n.body}</span>
          </div>
        ))}
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addNote(p.lead.id, note), "Anotação salva.", () => setNote(""));
          }}
        >
          <textarea
            aria-label="Nova anotação"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Escreva uma anotação"
            className="rounded-field border border-line-2 p-2.5 text-[12.5px]"
          />
          <Button size="sm" variant="secondary" type="submit" disabled={!note.trim() || pending} className="w-fit">
            Salvar anotação
          </Button>
        </form>
      </Panel>
    </>
  );
}
