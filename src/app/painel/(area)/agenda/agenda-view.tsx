"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Button, Chip, EmptyState, HelpTip, Icon, Tag, buttonClasses, useToast } from "@/components/ui";
import { WEEKDAYS, dayOf, dayTitle, gridHours, hourOf, joinFirstNames, weekDays, weekOfMonth, weekRangeLabel, addDays } from "@/lib/agenda";
import { cn } from "@/lib/cn";
import { VISIT_STATUS_LABELS, VISIT_STATUS_TONES, formatVisitWhen, fromLocalInput, type VisitStatus } from "@/lib/visits";
import { closeVisit, confirmVisit, offerOtherTimes, rescheduleVisit } from "../leads/actions";

export type AgendaVisit = {
  id: string;
  leadId: string;
  brokerId: string | null;
  brokerName: string | null;
  clientName: string;
  revoked: boolean;
  propertyTitle: string;
  neighborhood: string | null;
  canOfferOther: boolean;
  startsAt: string;
  status: VisitStatus;
  conflict: boolean;
};
type Filter = "todas" | "aguardando" | "confirmadas";
/** Um bloco na grade: uma visita, ou as visitas em horário duplicado do mesmo corretor juntas. */
type Block = { key: string; visits: AgendaVisit[]; conflict: boolean };

const active = (v: AgendaVisit) => v.status === "pedida" || v.status === "confirmada";
const needsYou = (v: AgendaVisit) => active(v) && (v.status === "pedida" || v.conflict);
const hourLabel = (iso: string) => formatVisitWhen(iso).split(", ").at(-1) ?? "";
const place = (v: AgendaVisit) => [v.propertyTitle, v.neighborhood].filter(Boolean).join(" · ");

const LEGEND: { label: string; className: string }[] = [
  { label: "Confirmada", className: "bg-black" },
  { label: "Aguardando confirmação", className: "border-[1.5px] border-black bg-white" },
  { label: "Realizada", className: "bg-ok-bg" },
  { label: "Horário duplicado", className: "border-[1.5px] border-bad bg-bad-bg" },
  { label: "Não compareceu", className: "bg-paper-2" },
  { label: "Cancelada", className: "border border-line-2 bg-paper" },
];

function blockClasses(b: Block) {
  if (b.conflict) return "border-[1.5px] border-bad bg-bad-bg text-bad";
  const s = b.visits[0].status;
  return {
    confirmada: "bg-black text-white",
    pedida: "border-[1.5px] border-black bg-white",
    realizada: "bg-ok-bg text-ok",
    nao_compareceu: "bg-paper-2 text-muted",
    cancelada: "bg-paper text-muted-2 line-through",
  }[s];
}

function toBlocks(visits: AgendaVisit[]): Block[] {
  const out: Block[] = [];
  const groups = new Map<string, AgendaVisit[]>();
  for (const v of visits) {
    if (!v.conflict) {
      out.push({ key: v.id, visits: [v], conflict: false });
      continue;
    }
    const k = `${v.brokerId}|${dayOf(v.startsAt)}|${hourOf(v.startsAt)}`;
    groups.set(k, [...(groups.get(k) ?? []), v]);
  }
  for (const [k, vs] of groups) out.push({ key: k, visits: vs, conflict: true });
  return out.sort((a, b) => a.visits[0].startsAt.localeCompare(b.visits[0].startsAt));
}

export function AgendaView({
  monday,
  visits,
  brokers,
  initialBroker,
  initialFilter,
  initialDay,
}: {
  monday: string;
  visits: AgendaVisit[];
  brokers: { id: string; name: string }[];
  initialBroker: string;
  initialFilter: Filter;
  initialDay?: string;
}) {
  const days = weekDays(monday);
  const [today] = useState(() => dayOf(Date.now()));
  const [broker, setBroker] = useState(brokers.some((b) => b.id === initialBroker) ? initialBroker : "");
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [day, setDay] = useState(() => {
    if (initialDay && days.includes(initialDay)) return initialDay;
    if (days.includes(today)) return today;
    return visits.length ? dayOf(visits[0].startsAt) : monday;
  });

  // Mantém os filtros no endereço: voltar, recarregar ou compartilhar abre igual.
  useEffect(() => {
    const q = new URLSearchParams({ semana: monday });
    if (broker) q.set("corretor", broker);
    if (filter !== "todas") q.set("filtro", filter);
    q.set("dia", day);
    window.history.replaceState(null, "", `/painel/agenda?${q}`);
  }, [monday, broker, filter, day]);

  const shown = visits.filter(
    (v) =>
      (!broker || v.brokerId === broker) &&
      (filter === "todas" || (filter === "aguardando" ? needsYou(v) : v.status === "confirmada" && !v.conflict)),
  );
  const blocks = toBlocks(shown);
  const open = blocks.find((b) => b.key === openKey) ?? null;
  const pendingCount = visits.filter((v) => (!broker || v.brokerId === broker) && needsYou(v)).length;
  const weekHref = (m: string) => {
    const q = new URLSearchParams({ semana: m });
    if (broker) q.set("corretor", broker);
    if (filter !== "todas") q.set("filtro", filter);
    return `/painel/agenda?${q}`;
  };
  const { month, week } = weekOfMonth(monday);

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      {(
        [
          ["todas", "Todas"],
          ["aguardando", pendingCount ? `Aguardando (${pendingCount})` : "Aguardando"],
          ["confirmadas", "Confirmadas"],
        ] as const
      ).map(([k, label]) => (
        <Chip key={k} selected={filter === k} onClick={() => setFilter(k)}>
          {label}
        </Chip>
      ))}
      {brokers.length > 1 ? (
        <label className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <span className="sr-only">Corretor</span>
          <select
            value={broker}
            onChange={(e) => setBroker(e.target.value)}
            className="min-h-9 rounded-full border border-line-2 bg-white px-3 text-xs font-semibold"
          >
            <option value="">Todos os corretores</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );

  const nav = (
    <div className="flex items-center gap-1">
      <Link href={weekHref(addDays(monday, -7))} aria-label="Semana anterior" className="grid size-touch place-items-center rounded-full hover:bg-white">
        <Icon name="back" />
      </Link>
      {!days.includes(today) ? (
        <Link href={weekHref(today)} className="min-h-touch content-center px-2 text-[13px] font-semibold underline underline-offset-4">
          Hoje
        </Link>
      ) : null}
      <Link href={weekHref(addDays(monday, 7))} aria-label="Próxima semana" className="grid size-touch place-items-center rounded-full hover:bg-white">
        <Icon name="arrow" />
      </Link>
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="trk flex items-center gap-1.5">
            Agenda de visitas
            <HelpTip label="Agenda de visitas">
              As visitas entram aqui quando o cliente escolhe um dos horários que você sugeriu ou quando você marca pela
              conversa do lead. Só o corretor confirma. Horário duplicado é quando o mesmo corretor tem duas visitas no
              mesmo horário.
            </HelpTip>
          </p>
          <h1 className="mt-1 hidden text-[30px] font-light tracking-tight lg:block">
            Semana de <b className="font-bold">{weekRangeLabel(monday)}</b>
          </h1>
          <h1 className="mt-1 text-[26px] font-light tracking-tight lg:hidden">
            {month}, <b className="font-bold">semana {week}</b>
          </h1>
          <p className="text-[12.5px] text-muted lg:hidden">{weekRangeLabel(monday)}</p>
        </div>
        {nav}
      </div>

      {filters}

      {visits.length === 0 ? (
        <EmptyState
          title="Nenhuma visita nesta semana."
          description="As visitas aparecem aqui quando o cliente escolhe um horário que você sugeriu ou quando você marca pela conversa do lead."
          action={
            <Link href="/painel/leads" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Ver leads
            </Link>
          }
        />
      ) : (
        <>
          {/* Computador: semana em grade; com uma visita aberta, o dia dela e o painel ao lado. */}
          <div className="hidden gap-3 lg:grid">
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
              {LEGEND.map((l) => (
                <li key={l.label} className="flex items-center gap-2">
                  <span aria-hidden className={cn("size-3.5 rounded-[4px]", l.className)} />
                  {l.label}
                </li>
              ))}
            </ul>
            <div className={cn("grid items-start gap-5", open && "grid-cols-[minmax(0,1fr)_380px]")}>
              <WeekGrid
                days={open ? [dayOf(open.visits[0].startsAt)] : days}
                today={today}
                blocks={blocks}
                openKey={openKey}
                onOpen={setOpenKey}
              />
              {open ? (
                <aside className="sticky top-6 rounded-[24px] bg-white p-5 shadow-[0_10px_30px_rgb(11_11_12/0.08)]">
                  <BlockDetail block={open} onClose={() => setOpenKey(null)} />
                </aside>
              ) : null}
            </div>
          </div>

          {/* Celular: semana em faixa + lista do dia. */}
          <div className="grid gap-4 lg:hidden">
            <DayStrip days={days} today={today} day={day} onPick={setDay} visits={shown} />
            <DayList day={day} blocks={blocks.filter((b) => dayOf(b.visits[0].startsAt) === day)} onOpen={setOpenKey} />
          </div>
          {open ? (
            <div className="fixed inset-0 z-50 flex items-end bg-black/55 lg:hidden" role="presentation" onClick={() => setOpenKey(null)}>
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Visita"
                className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[28px] bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3.5"
                onClick={(e) => e.stopPropagation()}
              >
                <span aria-hidden className="mx-auto mb-3 block h-[5px] w-10 rounded-full bg-line-2" />
                <BlockDetail block={open} onClose={() => setOpenKey(null)} />
              </div>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

function WeekGrid({
  days,
  today,
  blocks,
  openKey,
  onOpen,
}: {
  days: string[];
  today: string;
  blocks: Block[];
  openKey: string | null;
  onOpen: (k: string) => void;
}) {
  const inView = blocks.filter((b) => days.includes(dayOf(b.visits[0].startsAt)));
  const hours = gridHours(inView.map((b) => hourOf(b.visits[0].startsAt)));
  const cols = { gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` };
  return (
    <div className="overflow-hidden rounded-[20px] bg-white">
      <div className="grid border-b border-paper-2" style={cols}>
        <span />
        {days.map((d) => (
          <span
            key={d}
            className={cn("py-3 text-center text-[12.5px] font-semibold", d === today && days.length > 1 && "bg-black text-white")}
          >
            {days.length > 1 ? `${WEEKDAYS[days.indexOf(d)] ?? ""} ${Number(d.slice(8))}` : dayTitle(d)}
          </span>
        ))}
      </div>
      {hours.map((h) => (
        <div key={h} className="grid min-h-16 border-b border-paper-2 last:border-b-0" style={cols}>
          <span className="px-2 pt-2 text-[11px] text-muted-2">{h}h</span>
          {days.map((d) => (
            <div key={d} className="grid content-start gap-1 border-l border-paper-2 p-1">
              {inView
                .filter((b) => dayOf(b.visits[0].startsAt) === d && hourOf(b.visits[0].startsAt) === h)
                .map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => onOpen(b.key)}
                    aria-pressed={openKey === b.key}
                    className={cn("grid min-h-12 rounded-[10px] px-2 py-1.5 text-left text-[11.5px] leading-snug", blockClasses(b), openKey === b.key && "ring-2 ring-black ring-offset-1")}
                  >
                    {b.conflict ? (
                      <>
                        <b>Horário duplicado</b>
                        <span>
                          {joinFirstNames(b.visits.map((v) => v.clientName))} · {hourLabel(b.visits[0].startsAt)}
                        </span>
                      </>
                    ) : (
                      <>
                        <b className="truncate">{b.visits[0].clientName}</b>
                        <span className="line-clamp-2">
                          {b.visits[0].status === "confirmada" ? `${hourLabel(b.visits[0].startsAt)} · ${b.visits[0].propertyTitle}` : VISIT_STATUS_LABELS[b.visits[0].status]}
                        </span>
                      </>
                    )}
                  </button>
                ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DayStrip({ days, today, day, onPick, visits }: { days: string[]; today: string; day: string; onPick: (d: string) => void; visits: AgendaVisit[] }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((d, i) => {
        const count = visits.filter((v) => dayOf(v.startsAt) === d).length;
        const on = d === day;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onPick(d)}
            aria-pressed={on}
            aria-label={`${dayTitle(d)}${count ? `, ${count} visita${count > 1 ? "s" : ""}` : ""}`}
            className={cn("grid min-h-[70px] justify-items-center gap-1 rounded-[14px] py-2", on ? "bg-black text-white" : d === today ? "bg-white" : "")}
          >
            <span className="text-[11.5px] font-semibold">{WEEKDAYS[i]}</span>
            <span className="text-[17px] font-bold">{Number(d.slice(8))}</span>
            <span aria-hidden className="flex h-1.5 gap-0.5">
              {Array.from({ length: Math.min(count, 3) }, (_, j) => (
                <i key={j} className={cn("size-1.5 rounded-full", on ? "bg-white" : "bg-black")} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DayList({ day, blocks, onOpen }: { day: string; blocks: Block[]; onOpen: (k: string) => void }) {
  const need = blocks.filter((b) => b.visits.some(needsYou));
  const confirmed = blocks.filter((b) => !b.conflict && b.visits[0].status === "confirmada");
  const closed = blocks.filter((b) => !b.visits.some(active));
  const label = dayTitle(day).split(",")[0].toUpperCase() + " " + Number(day.slice(8));
  if (!blocks.length) return <EmptyState title="Nenhuma visita neste dia." description="Escolha outro dia na faixa acima." />;
  return (
    <div className="grid gap-3">
      {need.length ? (
        <>
          <p className="trk">{label} · Precisa de você</p>
          {need.map((b) => (
            <NeedCard key={b.key} block={b} onOpen={() => onOpen(b.key)} />
          ))}
        </>
      ) : null}
      {confirmed.length ? (
        <>
          <p className="trk mt-1">Confirmadas</p>
          {confirmed.map((b) => (
            <Row key={b.key} v={b.visits[0]} onOpen={() => onOpen(b.key)} />
          ))}
        </>
      ) : null}
      {closed.length ? (
        <>
          <p className="trk mt-1">Encerradas</p>
          {closed.map((b) => (
            <Row key={b.key} v={b.visits[0]} onOpen={() => onOpen(b.key)} />
          ))}
        </>
      ) : null}
    </div>
  );
}

function NeedCard({ block: b, onOpen }: { block: Block; onOpen: () => void }) {
  const v = b.visits[0];
  return (
    <div className="grid gap-3 rounded-[20px] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[22px] font-bold">{hourLabel(v.startsAt)}</span>
        <Tag tone={b.conflict ? "bad" : "warn"}>{b.conflict ? "Horário duplicado" : VISIT_STATUS_LABELS.pedida}</Tag>
      </div>
      <div>
        <p className="text-[14px] font-bold">{b.conflict ? joinFirstNames(b.visits.map((x) => x.clientName)) : v.clientName}</p>
        <p className="text-[12.5px] text-muted">{b.conflict ? `Mesmo horário com ${v.brokerName ?? "o corretor"}` : place(v)}</p>
      </div>
      {b.conflict ? (
        <Button fullWidth onClick={onOpen}>
          Resolver
        </Button>
      ) : (
        <VisitActions v={v} compact />
      )}
    </div>
  );
}

function Row({ v, onOpen }: { v: AgendaVisit; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex items-center gap-4 rounded-[18px] bg-white px-4 py-3.5 text-left">
      <span className={cn("w-12 flex-none text-[17px] font-bold", v.status === "cancelada" && "text-muted-2 line-through")}>{hourLabel(v.startsAt)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-bold">{v.clientName}</span>
        <span className="block truncate text-[12px] text-muted">{v.status === "confirmada" ? place(v) : VISIT_STATUS_LABELS[v.status]}</span>
      </span>
      <Icon name={v.status === "confirmada" ? "cal" : "arrow"} size="sm" className="text-muted" />
    </button>
  );
}

function BlockDetail({ block: b, onClose }: { block: Block; onClose: () => void }) {
  const v = b.visits[0];
  const when = formatVisitWhen(v.startsAt);
  const [date, time] = [when.split(", ").slice(0, 2).join(", "), hourLabel(v.startsAt)];
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-2">
        <Tag tone={b.conflict ? "bad" : VISIT_STATUS_TONES[v.status]}>{b.conflict ? "Horário duplicado" : VISIT_STATUS_LABELS[v.status]}</Tag>
        <button type="button" onClick={onClose} aria-label="Fechar" className="-m-2 grid size-touch place-items-center rounded-full hover:bg-paper">
          <Icon name="x" />
        </button>
      </div>
      <p className="text-[24px] font-light tracking-tight">
        {cap(date)} · <b className="font-bold">{time}</b>
      </p>
      {b.conflict ? (
        <>
          <p className="text-[12.5px] text-muted">
            {b.visits.length === 2 ? "Dois clientes" : `${b.visits.length} clientes`} estão no mesmo horário com {v.brokerName ?? "o mesmo corretor"}.
            Confirme um e sugira outro horário aos outros.
          </p>
          {b.visits.map((x) => (
            <div key={x.id} className="grid gap-3 rounded-[18px] border border-line p-3.5">
              <Who v={x} />
              <VisitActions v={x} />
            </div>
          ))}
        </>
      ) : (
        <>
          <Who v={v} showBroker />
          <VisitActions v={v} />
        </>
      )}
      <p className="text-[11.5px] text-muted">Só o corretor confirma. O cliente vê a confirmação no app.</p>
    </div>
  );
}

function Who({ v, showBroker }: { v: AgendaVisit; showBroker?: boolean }) {
  const initials = v.clientName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 flex-none place-items-center rounded-full bg-paper-2 text-[12px] font-bold">{initials}</span>
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-bold">{v.clientName}</p>
        <p className="truncate text-[12px] text-muted">{place(v)}</p>
        {showBroker && v.brokerName ? <p className="text-[12px] text-muted">Corretor(a): {v.brokerName}</p> : null}
      </div>
    </div>
  );
}

/** Ações da visita. As regras ficam no banco (só a equipe do lead confirma, regra 4). */
function VisitActions({ v, compact }: { v: AgendaVisit; compact?: boolean }) {
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"none" | "other" | "move">("none");
  const [slots, setSlots] = useState(["", "", ""]);
  const [now] = useState(() => Date.now());
  const started = new Date(v.startsAt).getTime() <= now;
  const run = (fn: () => Promise<{ error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      if (r.error) showToast(r.error);
      else {
        showToast(ok);
        setMode("none");
      }
    });
  const openLead = (
    <Link href={`/painel/leads/${v.leadId}`} className="min-h-touch content-center text-[12.5px] font-semibold underline underline-offset-4">
      Abrir conversa
    </Link>
  );

  if (v.revoked) {
    return (
      <div className="grid gap-1 text-[12.5px] text-muted">
        <p>O cliente revogou o compartilhamento. A visita não pode mais ser alterada por aqui.</p>
        {openLead}
      </div>
    );
  }
  if (mode !== "none") {
    const count = mode === "other" ? 3 : 1;
    return (
      <div className="grid gap-2">
        <p className="text-[12.5px] font-semibold">{mode === "other" ? "Sugira até 3 horários ao cliente" : "Nova data e hora"}</p>
        {slots.slice(0, count).map((s, i) => (
          <input
            key={i}
            type="datetime-local"
            aria-label={mode === "other" ? `Horário ${i + 1}` : "Nova data e hora"}
            value={s}
            onChange={(e) => setSlots(slots.map((x, j) => (j === i ? e.target.value : x)))}
            className="min-h-11 w-full min-w-0 rounded-field border border-line-2 bg-white px-3 text-[13px]"
          />
        ))}
        {mode === "other" ? (
          <p className="text-[11.5px] text-muted">O pedido atual é cancelado e os horários vão para a conversa em seu nome.</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            loading={pending}
            onClick={() => {
              const isos = slots.slice(0, count).map(fromLocalInput).filter((x): x is string => !!x);
              if (!isos.length) return showToast("Escolha a data e a hora.");
              if (mode === "other") run(() => offerOtherTimes(v.id, isos), "Novos horários enviados ao cliente.");
              else run(() => rescheduleVisit(v.id, isos[0]), "Visita remarcada. O cliente foi avisado.");
            }}
          >
            {mode === "other" ? "Enviar horários" : "Salvar"}
          </Button>
          <button type="button" className="min-h-touch px-1 text-[12.5px] font-semibold underline underline-offset-4" onClick={() => setMode("none")}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (v.status === "pedida") {
    return (
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          {v.canOfferOther ? (
            <Button variant="secondary" disabled={pending} onClick={() => setMode("other")}>
              Outro horário
            </Button>
          ) : null}
          <Button variant="secondary" loading={pending} onClick={() => run(() => confirmVisit(v.id), "Visita confirmada. O cliente foi avisado.")}>
            Confirmar
          </Button>
        </div>
        {!compact ? openLead : null}
      </div>
    );
  }
  if (v.status === "confirmada") {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {started ? (
          <>
            <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => closeVisit(v.id, "realizada"), "Visita marcada como realizada.")}>
              Realizada
            </Button>
            <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => closeVisit(v.id, "nao_compareceu"), "Registrado: cliente não compareceu.")}>
              Não compareceu
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => setMode("move")}>
              Remarcar
            </Button>
            <a href={`/api/visitas/${v.id}/calendario`} className="min-h-touch content-center text-[12.5px] font-semibold underline underline-offset-4">
              Adicionar ao calendário
            </a>
          </>
        )}
        {openLead}
        {!started ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => closeVisit(v.id, "cancelada"), "Visita cancelada. O cliente foi avisado.")}
            className="min-h-touch text-[12.5px] font-semibold text-muted underline underline-offset-4"
          >
            Cancelar visita
          </button>
        ) : null}
      </div>
    );
  }
  return <div className="text-[12.5px] text-muted">{openLead}</div>;
}
