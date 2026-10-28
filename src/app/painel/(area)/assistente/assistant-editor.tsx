"use client";

import { useRef, useState, useTransition } from "react";
import { Button, HelpTip, Icon, Tag, useToast } from "@/components/ui";
import {
  ASSISTANT_NAME_TAG,
  CLIENT_NAME_TAG,
  MAX_ENABLED_QUESTIONS,
  STANDARD_QUESTIONS,
  WARN_ENABLED_QUESTIONS,
  isStandardQuestion,
  questionOptions,
  renderMessage,
  type AssistantQuestion,
  type AssistantSettings,
} from "@/lib/assistant";
import { cn } from "@/lib/cn";
import { saveAssistantSettings } from "./actions";

/** P-10 · Quem atende primeiro: nome, mensagens e perguntas da assistente virtual. */
export function AssistantEditor({
  initial,
  canEdit,
  agencyName,
}: {
  initial: AssistantSettings;
  canEdit: boolean;
  agencyName: string;
}) {
  const [s, setS] = useState<AssistantSettings>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const enabledCount = s.questions.filter((q) => q.enabled).length;
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);
  const set = (patch: Partial<AssistantSettings>) => setS((x) => ({ ...x, ...patch }));
  const setQ = (id: string, patch: Partial<AssistantQuestion>) =>
    set({ questions: s.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  const moveQ = (i: number, d: -1 | 1) => {
    const list = [...s.questions];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set({ questions: list });
  };
  const addQ = () => {
    if (enabledCount >= MAX_ENABLED_QUESTIONS) return showToast(`Ligue no máximo ${MAX_ENABLED_QUESTIONS} perguntas.`);
    const id = `c_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    set({ questions: [...s.questions, { id, kind: "propria", text: "", enabled: true }] });
  };
  const preview = { clientName: "Ana", assistantName: s.name || "Assistente" };
  const firstQuestion = s.questions.find((q) => q.enabled);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="trk">Assistente virtual</p>
          <h1 className="mt-1 text-[28px] font-light tracking-tight">
            Quem atende <b className="font-bold">primeiro</b>.
          </h1>
          <p className="max-w-xl text-[13px] text-muted">
            A assistente dá as boas-vindas e faz as perguntas abaixo até o corretor enviar a primeira mensagem. As respostas
            entram na hora no perfil do lead.
          </p>
        </div>
        <label className="flex min-h-touch items-center gap-2.5 text-[13px] font-semibold">
          {s.enabled ? "Ligada" : "Desligada"}
          <Toggle checked={s.enabled} disabled={!canEdit} onChange={(v) => set({ enabled: v })} label="Assistente ligada" />
        </label>
      </div>

      {!canEdit ? (
        <p className="rounded-[14px] bg-white p-3 text-[12.5px] text-muted shadow-soft">Só o gestor edita esta tela.</p>
      ) : null}

      <div className={cn("grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]", !s.enabled && "opacity-60")}>
        <div className="grid content-start gap-5">
          <section className="grid gap-4 rounded-[20px] bg-white p-5 shadow-soft">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-[12.5px] font-semibold">
                Nome da assistente
                <input
                  value={s.name}
                  maxLength={30}
                  disabled={!canEdit}
                  onChange={(e) => set({ name: e.target.value })}
                  className="h-12 rounded-field border border-line-2 px-3.5 text-sm font-normal"
                />
              </label>
              <div className="grid gap-1.5 text-[12.5px] font-semibold">
                Como o cliente vê
                <p className="flex min-h-12 items-center gap-2 font-normal">
                  <b>{s.name || "Assistente"}</b>
                  <Tag>Assistente virtual</Tag>
                  <span className="text-[11.5px] text-muted-2">o selo não sai</span>
                </p>
              </div>
              <MessageField
                label="Boas-vindas"
                value={s.welcome_message}
                disabled={!canEdit}
                onChange={(v) => set({ welcome_message: v })}
              />
              <MessageField
                label="Despedida"
                hint="Enviada quando as perguntas terminam."
                value={s.farewell_message}
                disabled={!canEdit}
                onChange={(v) => set({ farewell_message: v })}
              />
            </div>
          </section>

          <section className="grid gap-3 rounded-[20px] bg-white p-5 shadow-soft">
            <p className="flex gap-2 rounded-[14px] bg-paper p-3 text-[12px] text-muted">
              <Icon name="edit" size="sm" className="mt-0.5 text-ink" />
              <span>
                <b className="text-ink">As mensagens são personalizáveis.</b> Boas-vindas, perguntas e despedida saem exatamente
                como você escrever. As respostas curtas entre uma pergunta e outra, e as respostas a dúvidas sobre os imóveis,
                são da IA.
              </span>
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="trk">
                Perguntas · {enabledCount} de {MAX_ENABLED_QUESTIONS}
              </h2>
              {canEdit ? (
                <Button variant="secondary" size="sm" onClick={addQ}>
                  Escrever pergunta
                </Button>
              ) : null}
            </div>
            <p className="text-[11.5px] text-muted">
              Use as setas para ordenar. A assistente pula o que o cliente já respondeu. Para aluguel, as perguntas de compra
              (pagamento, crédito, FGTS e venda de outro imóvel) não são feitas.
            </p>
            {enabledCount >= WARN_ENABLED_QUESTIONS ? (
              <p role="status" className="flex gap-2 rounded-[14px] bg-warn-bg p-3 text-[12px] text-warn">
                <Icon name="alert" size="sm" className="mt-0.5" />
                Muitas perguntas cansam o cliente. Prefira as que mais demoram para o corretor descobrir.
              </p>
            ) : null}
            <ul className="grid">
              {s.questions.map((q, i) => (
                <li key={q.id} className="flex items-start gap-2 border-t border-[#f0f0ee] py-3">
                  <div className="grid">
                    <button type="button" aria-label="Subir" disabled={!canEdit || i === 0} onClick={() => moveQ(i, -1)} className="grid size-8 place-items-center disabled:opacity-25">
                      <Icon name="back" size="sm" className="rotate-90" />
                    </button>
                    <button
                      type="button"
                      aria-label="Descer"
                      disabled={!canEdit || i === s.questions.length - 1}
                      onClick={() => moveQ(i, 1)}
                      className="grid size-8 place-items-center disabled:opacity-25"
                    >
                      <Icon name="back" size="sm" className="-rotate-90" />
                    </button>
                  </div>
                  <div className="grid min-w-0 flex-1 gap-1">
                    <input
                      aria-label="Texto da pergunta"
                      value={q.text}
                      maxLength={200}
                      disabled={!canEdit}
                      placeholder="Escreva a pergunta"
                      onChange={(e) => setQ(q.id, { text: e.target.value })}
                      className="h-11 rounded-field border border-transparent px-2 text-[13.5px] font-semibold hover:border-line-2 focus:border-line-2"
                    />
                    <p className="px-2 text-[11.5px] text-muted">
                      Preenche:{" "}
                      {isStandardQuestion(q.id)
                        ? `${STANDARD_QUESTIONS[q.id].label} · Padrão · opções: ${questionOptions(q.id).join(", ")}`
                        : "Respostas para a imobiliária · Sua pergunta"}
                    </p>
                  </div>
                  {canEdit && q.kind === "propria" ? (
                    <button
                      type="button"
                      aria-label="Remover pergunta"
                      onClick={() => set({ questions: s.questions.filter((x) => x.id !== q.id) })}
                      className="grid size-touch place-items-center text-muted"
                    >
                      <Icon name="trash" size="sm" />
                    </button>
                  ) : null}
                  <Toggle
                    checked={q.enabled}
                    disabled={!canEdit}
                    label={`Pergunta ligada: ${q.text}`}
                    onChange={(v) => {
                      if (v && enabledCount >= MAX_ENABLED_QUESTIONS) return showToast(`Ligue no máximo ${MAX_ENABLED_QUESTIONS} perguntas.`);
                      setQ(q.id, { enabled: v });
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-3 rounded-[20px] bg-white p-5 shadow-soft">
            <h2 className="trk flex items-center gap-1.5">
              Distribuição de leads
              <HelpTip label="Distribuição de leads">
                Rodízio: cada lead novo vai para o corretor ativo do rodízio que está há mais tempo sem receber lead. Manual: o lead chega sem
                corretor e o gestor escolhe quem atende. Quem entra no rodízio é definido em Equipe.
              </HelpTip>
            </h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["rodizio", "Rodízio entre corretores ativos"],
                  ["manual", "Atribuição manual pelo gestor"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  disabled={!canEdit}
                  aria-pressed={s.distribution === v}
                  onClick={() => set({ distribution: v })}
                  className={cn(
                    "min-h-touch rounded-full border px-4 text-[12.5px] font-semibold",
                    s.distribution === v ? "border-black bg-black text-white" : "border-line-2 bg-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11.5px] text-muted">Quem entra no rodízio é definido na tela Equipe.</p>
          </section>

          {canEdit ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={!dirty}
                loading={pending}
                onClick={() =>
                  start(async () => {
                    setError(null);
                    const r = await saveAssistantSettings(s);
                    if (r.error) setError(r.error);
                    else showToast("Assistente atualizada.");
                  })
                }
              >
                Salvar alterações
              </Button>
              {error ? (
                <p role="alert" className="text-[12.5px] font-semibold text-bad">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="grid content-start gap-4">
          <p className="trk">Prévia no app do cliente</p>
          <div className="grid gap-2.5 rounded-[22px] bg-paper p-3.5 shadow-card">
            {s.enabled ? (
              <>
                <PreviewBubble name={preview.assistantName} text={renderMessage(s.welcome_message, preview)} />
                {firstQuestion ? <PreviewBubble name={preview.assistantName} text={firstQuestion.text} /> : null}
              </>
            ) : (
              <p className="p-2 text-center text-[12px] text-muted">
                Desligada: o cliente vê “Seu perfil já está com o corretor. Continue a conversa por aqui.”
              </p>
            )}
          </div>
          <div className="grid gap-1.5 rounded-[20px] border border-dashed border-line-2 p-4 text-[12px] text-muted">
            <b className="text-[13px] text-ink">O que a {s.name || "assistente"} nunca faz</b>
            Agendar visita, negociar preço, prometer algo ou falar em nome do corretor. Dúvida que não está na ficha do imóvel
            vai para o corretor. Ela para quando o corretor envia a primeira mensagem.
          </div>
          <p className="text-[11px] text-muted-2">
            O nome da imobiliária ({agencyName}) aparece como você escrever nas mensagens.
          </p>
        </aside>
      </div>
    </div>
  );
}

function MessageField({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (tag: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + tag + value.slice(end));
    requestAnimationFrame(() => el?.focus());
  };
  return (
    <div className="grid content-start gap-1.5 text-[12.5px] font-semibold">
      {label}
      <textarea
        ref={ref}
        aria-label={label}
        value={value}
        maxLength={600}
        rows={4}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-field border border-line-2 p-3 text-[13px] font-normal"
      />
      {!disabled ? (
        <div className="flex flex-wrap gap-1.5">
          {[
            [CLIENT_NAME_TAG, "Nome do cliente"],
            [ASSISTANT_NAME_TAG, "Nome da assistente"],
          ].map(([tag, text]) => (
            <button
              key={tag}
              type="button"
              onClick={() => insert(tag)}
              className="min-h-9 rounded-full border border-line-2 px-3 text-[11.5px] font-semibold hover:border-black"
            >
              + {text}
            </button>
          ))}
        </div>
      ) : null}
      {hint ? <span className="text-[11px] font-normal text-muted-2">{hint}</span> : null}
    </div>
  );
}

function PreviewBubble({ name, text }: { name: string; text: string }) {
  return (
    <div className="grid w-fit max-w-[95%] gap-1 rounded-[18px] bg-white px-3.5 py-2.5 shadow-soft">
      <span className="flex items-center gap-1.5 text-[11px] font-bold">
        {name}
        <span className="rounded-full bg-paper-2 px-1.5 py-px text-[9.5px] uppercase tracking-[0.06em]">Assistente virtual</span>
      </span>
      <span className="text-[13px]">{text}</span>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 flex-none rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-black" : "bg-line-2",
      )}
    >
      <span className={cn("absolute top-1 size-5 rounded-full bg-white transition-all", checked ? "left-6" : "left-1")} />
    </button>
  );
}
