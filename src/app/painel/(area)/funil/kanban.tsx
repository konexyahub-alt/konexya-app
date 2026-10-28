"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, EmptyState, Icon, ScoreRing, Tag, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { CLOSED_STAGES, LOST_REASON_LABELS, OPEN_STAGES, STAGE_LABELS, nowMs, timeAgo, type LeadStage, type LostReason } from "@/lib/leads";
import type { LeadCard } from "@/lib/panel-leads";
import { moveStage } from "../leads/actions";

const PERIODS = [
  { label: "Tudo", days: 0 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

export function Kanban({ cards, team, isManager }: { cards: LeadCard[]; team: { id: string; name: string }[]; isManager: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [view, setView] = useState<"abertos" | "encerrados">("abertos");
  const [broker, setBroker] = useState("");
  const [period, setPeriod] = useState(0);
  const [mobileStage, setMobileStage] = useState<LeadStage>("novo");
  const [lostFor, setLostFor] = useState<LeadCard | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), 15000);
    return () => clearInterval(t);
  }, [router]);

  const filtered = useMemo(() => {
    const now = nowMs();
    return cards.filter(
      (c) =>
        (!broker || c.brokerId === broker) &&
        (!period || now - new Date(c.createdAt).getTime() <= period * 86400_000),
    );
  }, [cards, broker, period]);

  const move = (card: LeadCard, stage: LeadStage) => {
    if (stage === card.stage) return;
    if (stage === "perdido") return setLostFor(card);
    start(async () => {
      const r = await moveStage(card.id, stage);
      showToast(r.error ?? `${card.name} foi para ${STAGE_LABELS[stage]}.`);
    });
  };

  const stages = view === "abertos" ? OPEN_STAGES : CLOSED_STAGES;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-white p-1 shadow-soft">
          {(["abertos", "encerrados"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn("min-h-9 rounded-full px-4 text-[12.5px] font-semibold", view === v ? "bg-black text-white" : "text-muted")}
            >
              {v === "abertos" ? "Em andamento" : "Encerrados"}
            </button>
          ))}
        </div>
        {isManager ? (
          <select
            aria-label="Filtrar por corretor"
            value={broker}
            onChange={(e) => setBroker(e.target.value)}
            className="h-11 rounded-full border border-line-2 bg-white px-3 text-[12.5px] font-semibold"
          >
            <option value="">Todos os corretores</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        ) : null}
        <select
          aria-label="Período"
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
          className="h-11 rounded-full border border-line-2 bg-white px-3 text-[12.5px] font-semibold"
        >
          {PERIODS.map((p) => (
            <option key={p.days} value={p.days}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {!cards.length ? (
        <EmptyState
          title="Nenhum lead ainda."
          description="Quando um cliente autorizar o compartilhamento do perfil num imóvel de vocês, o lead aparece aqui na coluna Novo."
        />
      ) : (
        <>
          {/* Celular: uma coluna por vez, com abas no topo */}
          <div className="flex gap-1.5 overflow-x-auto lg:hidden">
            {stages.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setMobileStage(s)}
                aria-pressed={mobileStage === s}
                className={cn(
                  "min-h-9 flex-none rounded-full border px-3 text-xs font-semibold",
                  mobileStage === s ? "border-black bg-black text-white" : "border-line-2 bg-white",
                )}
              >
                {STAGE_LABELS[s]} · {filtered.filter((c) => c.stage === s).length}
              </button>
            ))}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stages.map((s, i) => {
              const list = filtered.filter((c) => c.stage === s);
              return (
                <section
                  key={s}
                  aria-label={STAGE_LABELS[s]}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    const card = cards.find((c) => c.id === dragging);
                    if (card) move(card, s);
                    setDragging(null);
                  }}
                  className={cn(
                    "grid w-full flex-none content-start gap-2.5 rounded-[20px] bg-paper-2/60 p-2.5 lg:w-[222px]",
                    mobileStage !== s && "hidden lg:grid",
                  )}
                >
                  <h2 className="flex items-center justify-between px-1.5 pt-1 text-[12.5px] font-bold">
                    {STAGE_LABELS[s]}
                    <span className="num rounded-full bg-white px-2 text-[11px]">{list.length}</span>
                  </h2>
                  {list.map((c) => (
                    <article
                      key={c.id}
                      draggable={view === "abertos"}
                      onDragStart={() => setDragging(c.id)}
                      className={cn(
                        "grid gap-2 rounded-[16px] bg-white p-3 shadow-soft",
                        c.stalled && "outline outline-[1.5px] outline-bad",
                        pending && dragging === c.id && "opacity-50",
                      )}
                    >
                      <Link href={`/painel/leads/${c.id}`} className="grid gap-1.5">
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate text-[13.5px] font-bold">{c.name}</span>
                            <span className="line-clamp-2 text-[11.5px] text-muted">{c.search}</span>
                          </span>
                          {c.score !== null ? <ScoreRing score={c.score} size={36} /> : null}
                        </span>
                        {c.budget ? <span className="text-[11.5px] font-semibold">{c.budget}</span> : null}
                        <span className="flex flex-wrap items-center gap-1.5">
                          {c.revoked ? <Tag tone="bad">Revogado</Tag> : c.awaiting ? <Tag tone="dark">Aguardando você</Tag> : null}
                          {c.stalled ? <Tag tone="bad">Parado há 48 h+</Tag> : null}
                          {s === "perdido" && c.lostReason ? <Tag>{LOST_REASON_LABELS[c.lostReason]}</Tag> : null}
                        </span>
                        <span className="flex items-center justify-between text-[11px] text-muted-2">
                          <span className="grid size-6 place-items-center rounded-full bg-paper-2 text-[10px] font-bold text-ink" title={c.brokerName ?? "Sem responsável"}>
                            {c.brokerName ? initials(c.brokerName) : "?"}
                          </span>
                          {timeAgo(c.stageChangedAt)}
                        </span>
                      </Link>
                      {view === "abertos" ? (
                        <div className="flex justify-between">
                          <button
                            type="button"
                            aria-label={`Mover ${c.name} para ${i > 0 ? STAGE_LABELS[stages[i - 1]] : "a etapa anterior"}`}
                            disabled={i === 0 || pending}
                            onClick={() => move(c, stages[i - 1])}
                            className="grid size-9 place-items-center rounded-full hover:bg-paper disabled:opacity-30"
                          >
                            <Icon name="back" size="sm" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setLostFor(c)}
                            disabled={pending}
                            className="min-h-9 px-2 text-[11.5px] font-semibold text-muted underline underline-offset-2"
                          >
                            Perdido
                          </button>
                          <button
                            type="button"
                            aria-label={`Mover ${c.name} para ${i < stages.length - 1 ? STAGE_LABELS[stages[i + 1]] : "Fechado"}`}
                            disabled={pending}
                            onClick={() => move(c, i < stages.length - 1 ? stages[i + 1] : "fechado")}
                            className="grid size-9 place-items-center rounded-full hover:bg-paper disabled:opacity-30"
                          >
                            <Icon name="arrow" size="sm" />
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </section>
              );
            })}
          </div>
        </>
      )}

      {lostFor ? <LostDialog card={lostFor} onClose={() => setLostFor(null)} /> : null}
    </div>
  );
}

/** Mover para Perdido pede o motivo (e é a única confirmação do funil). */
function LostDialog({ card, onClose }: { card: LeadCard; onClose: () => void }) {
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [reason, setReason] = useState<LostReason | null>(null);
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="perdido-titulo"
        onClick={(e) => e.stopPropagation()}
        className="grid w-full max-w-[420px] gap-4 rounded-[24px] bg-white p-6 shadow-pop"
      >
        <div>
          <p className="trk">Mover para Perdido</p>
          <h2 id="perdido-titulo" className="mt-1 text-xl font-bold">
            Por que {card.name} foi perdido?
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(LOST_REASON_LABELS) as LostReason[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              aria-pressed={reason === r}
              className={cn("min-h-touch rounded-full border px-3.5 text-[12.5px] font-semibold", reason === r ? "border-black bg-black text-white" : "border-line-2")}
            >
              {LOST_REASON_LABELS[r]}
            </button>
          ))}
        </div>
        <input
          aria-label="Observação (opcional)"
          placeholder="Observação (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          className="h-12 rounded-field border border-line-2 px-3 text-[13px]"
        />
        <div className="flex gap-2">
          <Button
            disabled={!reason}
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await moveStage(card.id, "perdido", reason, note);
                showToast(r.error ?? `${card.name} foi para Perdido.`);
                if (!r.error) onClose();
              })
            }
          >
            Marcar como perdido
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
