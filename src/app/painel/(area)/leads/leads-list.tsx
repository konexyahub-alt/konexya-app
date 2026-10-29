"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Chip, EmptyState, Icon, ScoreBadge, Tag } from "@/components/ui";
import { CLOSED_STAGES, OPEN_STAGES, STAGE_LABELS, timeAgo } from "@/lib/leads";
import { normalizeText } from "@/lib/neighborhoods";
import type { LeadCard } from "@/lib/panel-leads";

type Filter = "andamento" | "aguardando" | "parados" | "encerrados";

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
export function LeadsList({ cards, userId, isManager }: { cards: LeadCard[]; userId: string; isManager: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("andamento");
  const [stage, setStage] = useState<string>("");
  const [mine, setMine] = useState(false);

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
      if (stage && c.stage !== stage) return false;
      if (filter === "andamento") return isActive(c);
      if (filter === "aguardando") return c.awaiting;
      if (filter === "parados") return c.stalled;
      return !isActive(c);
    });
  }, [cards, query, filter, stage, mine, userId]);

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
          {isManager ? (
            <Chip selected={mine} onClick={() => setMine(!mine)}>
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
                  <Tag tone="neutral">{STAGE_LABELS[c.stage]}</Tag>
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
