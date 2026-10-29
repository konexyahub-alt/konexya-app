"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Chip, EmptyState, Icon, ScoreBadge, Tag } from "@/components/ui";
import { CLOSED_STAGES, LOST_REASON_LABELS, OPEN_STAGES, STAGE_LABELS, timeAgo } from "@/lib/leads";
import { normalizeText } from "@/lib/neighborhoods";
import type { LeadCard } from "@/lib/panel-leads";

export type Filter = "andamento" | "aguardando" | "parados" | "encerrados";
/** Filtros vindos do endereço (atalhos das Métricas). */
export type LeadsInitial = {
  filter?: Filter;
  stage?: string;
  broker?: string;
  reason?: string;
  /** Período de chegada do lead: "7", "30", "90" ou datas (de/até, AAAA-MM-DD). */
  period?: string;
  from?: string;
  to?: string;
};
const DAY = 86_400_000;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "andamento", label: "Em andamento" },
  { key: "aguardando", label: "Aguardando resposta" },
  { key: "parados", label: "Parados há 48 h+" },
  { key: "encerrados", label: "Encerrados" },
];

/** Em andamento: etapa aberta e consentimento ativo. Revogado vai para Encerrados (não há mais o que fazer). */
function isActive(c: LeadCard) {
  return OPEN_STAGES.includes(c.stage) && !c.revoked;
}

/** Lista de leads com busca por nome, filtros rápidos, etapa e (para o gestor) "Meus leads". */
export function LeadsList({
  cards,
  userId,
  isManager,
  initial = {},
}: {
  cards: LeadCard[];
  userId: string;
  isManager: boolean;
  initial?: LeadsInitial;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(
    initial.filter ?? (CLOSED_STAGES.includes(initial.stage as LeadCard["stage"]) || initial.reason ? "encerrados" : "andamento"),
  );
  const [stage, setStage] = useState<string>(initial.stage ?? "");
  const [mine, setMine] = useState(false);
  const [broker, setBroker] = useState(initial.broker ?? "");
  const [reason, setReason] = useState(initial.reason ?? "");
  const custom = initial.from && initial.to ? { from: initial.from, to: initial.to } : null;
  const [period, setPeriod] = useState(custom ? "custom" : (initial.period ?? ""));
  const [now] = useState(() => Date.now());
  const brokers = useMemo(
    () => [...new Map(cards.filter((c) => c.brokerId).map((c) => [c.brokerId!, c.brokerName ?? "Corretor"])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [cards],
  );
  const inPeriod = (iso: string) => {
    if (!period) return true;
    const t = new Date(iso).getTime();
    if (period === "custom" && custom) return t >= Date.parse(`${custom.from}T00:00:00-03:00`) && t < Date.parse(`${custom.to}T00:00:00-03:00`) + DAY;
    return t >= now - Number(period) * DAY;
  };

  const counts = useMemo(
    () => ({
      andamento: cards.filter((c) => isActive(c)).length,
      aguardando: cards.filter((c) => c.awaiting).length,
      parados: cards.filter((c) => c.stalled).length,
      encerrados: cards.filter((c) => !isActive(c)).length,
    }),
    [cards],
  );

  const shown = useMemo(() => {
    const q = normalizeText(query);
    return cards.filter((c) => {
      if (q && !normalizeText(c.name).includes(q)) return false;
      if (mine && c.brokerId !== userId) return false;
      if (broker && c.brokerId !== broker) return false;
      if (stage && c.stage !== stage) return false;
      if (reason && c.lostReason !== reason) return false;
      if (!inPeriod(c.createdAt)) return false;
      if (filter === "andamento") return isActive(c);
      if (filter === "aguardando") return c.awaiting;
      if (filter === "parados") return c.stalled;
      return !isActive(c);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, query, filter, stage, mine, userId, broker, reason, period]);

  const stages = filter === "encerrados" ? CLOSED_STAGES : OPEN_STAGES;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-[20px] bg-white p-4 shadow-soft">
        <label className="flex h-11 items-center gap-2 rounded-full bg-paper px-4 focus-within:outline-2 focus-within:outline-black">
          <Icon name="search" size="sm" className="text-muted-2" />
          <span className="sr-only">Buscar lead pelo nome</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pelo nome do cliente"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-2"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              selected={filter === f.key}
              onClick={() => {
                setFilter(f.key);
                setStage("");
                if (f.key !== "encerrados") setReason("");
              }}
            >
              {f.label}
              <span className="num opacity-70">{counts[f.key]}</span>
            </Chip>
          ))}
          <select
            aria-label="Etapa do funil"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="min-h-9 rounded-full border border-line-2 bg-white px-3 text-xs font-semibold"
          >
            <option value="">Todas as etapas</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
          {filter === "encerrados" ? (
            <select
              aria-label="Motivo de perda"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-9 rounded-full border border-line-2 bg-white px-3 text-xs font-semibold"
            >
              <option value="">Todos os motivos</option>
              {Object.entries(LOST_REASON_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          ) : null}
          <select
            aria-label="Período de chegada"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="min-h-9 rounded-full border border-line-2 bg-white px-3 text-xs font-semibold"
          >
            <option value="">Qualquer data</option>
            <option value="7">Chegaram nos últimos 7 dias</option>
            <option value="30">Chegaram nos últimos 30 dias</option>
            <option value="90">Chegaram nos últimos 90 dias</option>
            {custom ? (
              <option value="custom">
                Chegaram de {custom.from.split("-").reverse().slice(0, 2).join("/")} a {custom.to.split("-").reverse().slice(0, 2).join("/")}
              </option>
            ) : null}
          </select>
          {isManager && brokers.length > 1 ? (
            <select
              aria-label="Corretor"
              value={broker}
              onChange={(e) => {
                setBroker(e.target.value);
                setMine(false);
              }}
              className="min-h-9 rounded-full border border-line-2 bg-white px-3 text-xs font-semibold"
            >
              <option value="">Todos os corretores</option>
              {brokers.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          ) : null}
          {isManager ? (
            <Chip
              selected={mine}
              onClick={() => {
                setMine(!mine);
                setBroker("");
              }}
            >
              Meus leads
            </Chip>
          ) : null}
        </div>
      </div>

      {shown.length ? (
        <ul className="grid gap-2.5">
          {shown.map((c) => (
            <li key={c.id}>
              <Link
                href={`/painel/leads/${c.id}`}
                className="grid gap-2 rounded-[18px] bg-white p-4 shadow-soft outline outline-1 outline-transparent transition-[outline-color] hover:outline-black sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <span className="grid min-w-0 gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[15px] font-bold">{c.name}</span>
                    {c.score !== null ? <ScoreBadge score={c.score} /> : null}
                  </span>
                  <span className="truncate text-[12.5px] text-muted">
                    {[c.search, c.budget].filter(Boolean).join(" · ") || "Perfil em construção"}
                  </span>
                  <span className="truncate text-[11.5px] text-muted-2">
                    {isManager ? `${c.brokerName ?? "Sem corretor"} · ` : ""}última mensagem {timeAgo(c.lastMessageAt)}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                  {c.revoked ? <Tag tone="neutral">Revogado</Tag> : null}
                  {c.awaiting && !c.revoked ? <Tag tone="warn">Aguardando resposta</Tag> : null}
                  {c.stalled ? <Tag tone="bad">48 h+</Tag> : null}
                  {/* Revogado encerra o atendimento: a etapa antiga ("Em atendimento") só confundiria. */}
                  {c.revoked ? null : <Tag tone="neutral">{STAGE_LABELS[c.stage]}</Tag>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={cards.length ? "Nenhum lead com esses filtros." : "Nenhum lead ainda."}
          description={
            cards.length
              ? "Mude o filtro ou apague a busca."
              : "Os leads chegam quando um cliente autoriza o compartilhamento do perfil num imóvel de vocês."
          }
        />
      )}
    </div>
  );
}
