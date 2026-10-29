import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { EmptyState, HelpTip, Icon, Skeleton } from "@/components/ui";
import { requireApprovedMember } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { LOST_REASON_LABELS, formatDuration, nowMs } from "@/lib/leads";
import { deltaCount, deltaPoints, deltaTime, pct, periodRange, type Delta, type PeriodKind } from "@/lib/metrics";
import { loadMetrics, type Metrics } from "@/lib/metrics-data";
import { MetricsFilters } from "./filters";

/** P-09 · Métricas em 5 abas, com período, corretor e atalhos para as telas responsáveis (docs/DECISOES.md). */
export default function MetricsPage({ searchParams }: PageProps<"/painel/metricas">) {
  return (
    <main className="grid content-start gap-5 px-4 py-6 lg:px-9 lg:py-7">
      <div>
        <p className="trk">Métricas</p>
        <h1 className="mt-1 text-[28px] font-light tracking-tight">
          Como está o <b className="font-bold">negócio</b>
        </h1>
      </div>
      <Suspense fallback={<Skeleton className="h-[520px] rounded-[20px]" />}>
        <Body searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const TABS = [
  { key: "geral", label: "Visão geral" },
  { key: "atendimento", label: "Atendimento e equipe" },
  { key: "funil", label: "Funil e conversão" },
  { key: "imoveis", label: "Imóveis" },
  { key: "ia", label: "IA e assistente" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const DAY = 86_400_000;

/** "14 min", "3 h 40 min", "1,8 dia". */
function fmtLong(ms: number) {
  if (ms < DAY) return formatDuration(ms);
  const d = Math.round((ms / DAY) * 10) / 10;
  return `${String(d).replace(".", ",")} ${d < 2 ? "dia" : "dias"}`;
}

async function Body({ searchParams }: Pick<PageProps<"/painel/metricas">, "searchParams">) {
  const { membership } = await requireApprovedMember("/painel/metricas");
  if (membership.role !== "gestor") redirect("/painel/inicio");
  const params = await searchParams;
  const periodParam = one(params.periodo);
  const kind: PeriodKind = periodParam === "7" || periodParam === "90" || periodParam === "custom" ? periodParam : "30";
  const de = one(params.de);
  const ate = one(params.ate);
  const { current, previous } = periodRange(kind, de, ate, nowMs());
  const tabParam = one(params.aba);
  const tab: Tab = TABS.some((t) => t.key === tabParam) ? (tabParam as Tab) : "geral";
  const team = await loadMetrics(membership.agencyId, current, previous, null);
  const brokerParam = one(params.corretor) ?? "";
  const broker = team.brokers.some((b) => b.id === brokerParam) && !membership.autonomous ? brokerParam : "";
  const m = broker ? await loadMetrics(membership.agencyId, current, previous, broker) : team;

  const query: Record<string, string> = { periodo: kind, aba: tab };
  if (kind === "custom" && de && ate) Object.assign(query, { de, ate });
  if (broker) query.corretor = broker;
  // Atalhos: abrem a tela responsável já filtrada, mantendo período e corretor.
  const leadsHref = (extra: Record<string, string> = {}) => {
    const q = new URLSearchParams(extra);
    if (kind === "custom" && de && ate) {
      q.set("de", de);
      q.set("ate", ate);
    } else q.set("periodo", kind);
    if (broker && !q.has("corretor")) q.set("corretor", broker);
    return `/painel/leads?${q}`;
  };
  const tabHref = (t: Tab) => `/painel/metricas?${new URLSearchParams({ ...query, aba: t })}`;

  return (
    <>
      <MetricsFilters
        query={query}
        period={kind}
        de={de}
        ate={ate}
        broker={broker}
        brokers={membership.autonomous ? [] : team.brokers}
      />
      <nav aria-label="Abas das métricas" className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 lg:mx-0 lg:px-0">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "-mb-px flex min-h-touch flex-none items-center border-b-2 px-3.5 text-[13.5px] font-semibold",
              tab === t.key ? "border-black text-black" : "border-transparent text-muted hover:text-black",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "geral" ? <Overview m={m} leadsHref={leadsHref} broker={broker} /> : null}
      {tab === "atendimento" ? <Service m={m} leadsHref={leadsHref} /> : null}
      {tab === "funil" ? <Funnel m={m} leadsHref={leadsHref} /> : null}
      {tab === "imoveis" ? <Properties m={m} /> : null}
      {tab === "ia" ? <Ai m={m} /> : null}

      <p className="text-[12px] text-muted-2">
        Comparação com os {previous.days} dias anteriores. Números calculados com os dados do app; sem dados no período, o quadro fica vazio.
      </p>
    </>
  );
}

// --------------------------------------------------------------------------------------------------
// Peças
// --------------------------------------------------------------------------------------------------

function DeltaText({ d, dark }: { d: Delta; dark?: boolean }) {
  if (!d) return null;
  const arrow = d.good === null ? "=" : d.text.startsWith("-") || d.text.includes("mais rápido") ? "▼" : "▲";
  return (
    <span
      className={cn(
        "text-[12px] font-semibold",
        d.good === null ? (dark ? "text-white/70" : "text-muted") : d.good ? (dark ? "text-[#7fd6a8]" : "text-ok") : dark ? "text-[#ff9b9b]" : "text-bad",
      )}
    >
      {arrow} {d.text.replace(/^[+-]/, "")}
      <span className="sr-only"> em relação ao período anterior</span>
    </span>
  );
}

function Kpi({ label, value, delta, note, dark, help }: { label: string; value: string; delta?: Delta; note?: string; dark?: boolean; help?: string }) {
  return (
    <div className={cn("grid content-start gap-1.5 rounded-[20px] p-4", dark ? "bg-black text-white" : "bg-white")}>
      <p className={cn("flex items-start gap-1 text-[10.5px] font-semibold uppercase tracking-[0.14em]", dark ? "text-white/70" : "text-muted")}>
        {label}
        {help ? <HelpTip label={label}>{help}</HelpTip> : null}
      </p>
      <p className="text-[28px] font-light tracking-tight">{value}</p>
      {delta ? <DeltaText d={delta} dark={dark} /> : null}
      {note ? <p className={cn("text-[12px] font-semibold", dark ? "text-white/70" : "text-muted")}>{note}</p> : null}
    </div>
  );
}

function Panel({ title, children, aside, className }: { title: string; children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <section className={cn("grid content-start gap-3 rounded-[20px] bg-white p-4 lg:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="trk">{title}</h2>
        {aside ? <span className="text-[12px] text-muted">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

/** Linha de lista; com href, vira atalho clicável (com ›). */
function Line({ label, value, href, badge }: { label: ReactNode; value: ReactNode; href?: string; badge?: "bad" | "warn" | "neutral" }) {
  const v = badge ? (
    <span className={cn("grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[11.5px] font-bold", badge === "bad" ? "bg-bad-bg text-bad" : badge === "warn" ? "bg-warn-bg text-warn" : "bg-paper-2")}>
      {value}
    </span>
  ) : (
    <b className="text-[13.5px]">{value}</b>
  );
  const body = (
    <>
      <span className="min-w-0 flex-1 text-[13.5px]">{label}</span>
      {v}
      {href ? <span aria-hidden className="text-muted">›</span> : null}
    </>
  );
  return href ? (
    <Link href={href} className="flex min-h-touch items-center gap-2.5 border-b border-paper-2 last:border-b-0 hover:bg-paper">
      {body}
    </Link>
  ) : (
    <div className="flex min-h-touch items-center gap-2.5 border-b border-paper-2 last:border-b-0">{body}</div>
  );
}

function Empty({ text }: { text: string }) {
  return <EmptyState title="Ainda sem dados neste período." description={text} className="py-6" />;
}

/** Barras de uma série (preto). Cada barra mostra o valor ao passar o dedo ou o mouse. */
function Bars({ values, labels, muted, height = 140 }: { values: number[]; labels: string[]; muted?: boolean[]; height?: number }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }} role="img" aria-label={values.map((v, i) => `${labels[i]}: ${v}`).join("; ")}>
      {values.map((v, i) => (
        <span key={i} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${labels[i]}: ${v}`}>
          <span
            className={cn("w-full rounded-t-[4px]", v ? (muted?.[i] ? "bg-line-2" : "bg-black") : "bg-paper-2")}
            style={{ height: v ? `${Math.max(4, (v / max) * 100)}%` : 3 }}
          />
          <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-2 py-1 text-[11px] text-white group-hover:block">
            {labels[i]}: {v}
          </span>
        </span>
      ))}
    </div>
  );
}

function Meter({ label, value, share, href }: { label: string; value: string; share: number; href?: string }) {
  const body = (
    <span className="grid gap-1.5">
      <span className="flex items-center justify-between gap-2 text-[13.5px]">
        <span className="min-w-0">{label}</span>
        <b>
          {value}
          {href ? <span className="ml-1.5 font-normal text-muted">›</span> : null}
        </b>
      </span>
      <span className="h-1.5 rounded-full bg-paper-2">
        <span className="block h-full rounded-full bg-black" style={{ width: `${Math.round(share * 100)}%` }} />
      </span>
    </span>
  );
  return href ? (
    <Link href={href} className="block rounded-lg py-1 hover:bg-paper">
      {body}
    </Link>
  ) : (
    <div className="py-1">{body}</div>
  );
}

// --------------------------------------------------------------------------------------------------
// Abas
// --------------------------------------------------------------------------------------------------

type LeadsHref = (extra?: Record<string, string>) => string;

function Overview({ m, leadsHref, broker }: { m: Metrics; leadsHref: LeadsHref; broker: string }) {
  const o = m.overview;
  const days = o.perDay;
  const avg = days.length ? o.leads / days.length : 0;
  const label = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          dark
          label="1ª resposta humana"
          value={o.first.avgMs === null ? "—" : formatDuration(o.first.avgMs)}
          delta={deltaTime(o.first.avgMs, o.firstPrev.avgMs, formatDuration)}
          help="Média do tempo entre o cliente autorizar o perfil e a primeira mensagem enviada ou aprovada por um corretor. A boas-vindas da assistente não conta."
        />
        <Kpi label="Leads recebidos" value={String(o.leads)} delta={deltaCount(o.leads, o.leadsPrev)} />
        <Kpi label="Visitas realizadas" value={String(o.visitsDone)} delta={deltaCount(o.visitsDone, o.visitsDonePrev)} />
        <Kpi label="Propostas" value={String(o.proposals)} delta={deltaCount(o.proposals, o.proposalsPrev)} />
        <Kpi label="Negócios fechados" value={String(o.closed)} delta={deltaCount(o.closed, o.closedPrev)} />
        <Kpi
          label="Taxa lead → fechado"
          value={pct(o.conversion)}
          delta={deltaPoints(o.conversion, o.conversionPrev)}
          help="Negócios fechados no período divididos pelos leads que chegaram no período."
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Leads por dia" aside={o.leads ? `média ${String(Math.round(avg * 10) / 10).replace(".", ",")} por dia` : undefined}>
          {o.leads ? (
            <>
              <Bars values={days.map((d) => d.count)} labels={days.map((d) => label(d.day))} />
              <div className="flex justify-between text-[11px] text-muted-2">
                <span>{label(days[0].day)}</span>
                <span>{label(days[Math.floor(days.length / 2)].day)}</span>
                <span>{label(days.at(-1)!.day)}</span>
              </div>
            </>
          ) : (
            <Empty text="Os leads aparecem aqui quando os clientes autorizam o perfil nos seus imóveis." />
          )}
        </Panel>
        <Panel title="Precisa de atenção">
          <div>
            <Line label="Leads parados há 48 h+" value={o.attention.stalled} badge={o.attention.stalled ? "bad" : "neutral"} href={leadsHref({ filtro: "parados" })} />
            <Line
              label="Visitas aguardando confirmação"
              value={o.attention.visitsPending}
              badge={o.attention.visitsPending ? "warn" : "neutral"}
              href={`/painel/agenda?filtro=aguardando${broker ? `&corretor=${broker}` : ""}`}
            />
            <Line
              label="Propostas sem encaminhar"
              value={o.attention.proposalsPending}
              badge={o.attention.proposalsPending ? "warn" : "neutral"}
              href={leadsHref({ etapa: "proposta" })}
            />
            <Line label="Anúncios sem o selo Anúncio completo" value={o.attention.noSeal} badge="neutral" href="/painel/imoveis?selo=nao" />
          </div>
          <p className="text-[11.5px] text-muted-2">Situação de agora, independente do período.</p>
        </Panel>
      </div>
    </>
  );
}

function Service({ m, leadsHref }: { m: Metrics; leadsHref: LeadsHref }) {
  const s = m.service;
  const hours = s.perHour;
  const offHour = (h: number) => h < 8 || h >= 18;
  const fk = s.firstKinds;
  const fkTotal = fk.aprovada + fk.editada + fk.zero;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          dark
          label="1ª resposta humana (média)"
          value={s.first.avgMs === null ? "—" : formatDuration(s.first.avgMs)}
          delta={deltaTime(s.first.avgMs, s.firstPrev.avgMs, formatDuration)}
        />
        <Kpi label="Respondidos em até 15 min" value={pct(s.first.within15)} delta={deltaPoints(s.first.within15, s.firstPrev.within15)} />
        <Kpi
          label="Tempo médio de resposta"
          value={s.reply === null ? "—" : formatDuration(s.reply)}
          delta={deltaTime(s.reply, s.replyPrev, formatDuration)}
          help="Durante a conversa: da mensagem do cliente que ficou sem resposta até a próxima mensagem do corretor."
        />
        <Kpi
          label="Fora do horário comercial"
          value={`${s.offHours} ${s.offHours === 1 ? "lead" : "leads"}`}
          note={s.offShare === null ? undefined : `${pct(s.offShare)} do total`}
          help="Leads que chegaram fora de segunda a sexta das 8h às 18h e de sábado das 8h às 12h."
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Por corretor">
          {s.byBroker.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-muted">
                    <th className="py-2 font-semibold">Corretor</th>
                    <th className="py-2 pl-4 text-right font-semibold">1ª resposta</th>
                    <th className="py-2 pl-4 text-right font-semibold">Resposta média</th>
                    <th className="py-2 pl-4 text-right font-semibold">Leads</th>
                    <th className="py-2 pl-4 text-right font-semibold">Visitas</th>
                    <th className="py-2 pl-4 text-right font-semibold">Fechados</th>
                  </tr>
                </thead>
                <tbody>
                  {s.byBroker.map((b) => (
                    <tr key={b.id} className="border-t border-paper-2">
                      <td className="py-2.5 font-semibold">
                        <Link href={leadsHref({ corretor: b.id })} className="hover:underline">
                          {b.name} <span className="text-muted">›</span>
                        </Link>
                      </td>
                      <td className="py-2.5 pl-4 text-right">{b.first === null ? "—" : formatDuration(b.first)}</td>
                      <td className="py-2.5 pl-4 text-right">{b.reply === null ? "—" : formatDuration(b.reply)}</td>
                      <td className="py-2.5 pl-4 text-right">{b.leads}</td>
                      <td className="py-2.5 pl-4 text-right">{b.visits}</td>
                      <td className="py-2.5 pl-4 text-right">{b.closed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="Ninguém da equipe recebeu leads neste período." />
          )}
        </Panel>
        <Panel title="Leads por hora do dia" aside="cinza = fora do horário">
          {hours.some(Boolean) ? (
            <>
              <Bars values={hours} labels={hours.map((_, h) => `${h}h`)} muted={hours.map((_, h) => offHour(h))} height={120} />
              <div className="flex justify-between text-[11px] text-muted-2">
                <span>0h</span>
                <span>12h</span>
                <span>23h</span>
              </div>
            </>
          ) : (
            <Empty text="Sem leads no período." />
          )}
        </Panel>
      </div>
      <section className="grid gap-4 rounded-[20px] bg-white p-4 md:grid-cols-2 lg:p-5">
        <div className="grid gap-1.5">
          <h2 className="trk">Distribuição de leads</h2>
          <p className="text-[13.5px]">
            {s.distribution === "rodizio" ? "Rodízio" : "Manual"}
            {s.byBroker.length ? ` · ${s.byBroker.map((b) => `${b.name.split(" ")[0]} ${b.leads}`).join(" · ")}` : ""}
          </p>
        </div>
        <div className="grid gap-1.5">
          <h2 className="trk flex items-center gap-1.5">
            Primeira mensagem
            <HelpTip label="Primeira mensagem">Como saiu a primeira mensagem do corretor em cada lead do período: sugestão da IA aprovada como estava, editada antes de enviar, ou escrita do zero.</HelpTip>
          </h2>
          <p className="text-[13.5px]">
            {fkTotal
              ? `${pct(fk.aprovada / fkTotal)} aprovadas da sugestão da IA · ${pct(fk.editada / fkTotal)} editadas · ${pct(fk.zero / fkTotal)} escritas do zero`
              : "Nenhuma primeira mensagem no período."}
          </p>
        </div>
      </section>
    </>
  );
}

function Funnel({ m, leadsHref }: { m: Metrics; leadsHref: LeadsHref }) {
  const f = m.funnel;
  const stageParam: Record<string, Record<string, string>> = {
    novo: { etapa: "novo" },
    em_atendimento: { etapa: "em_atendimento" },
    qualificado: { etapa: "qualificado" },
    visita_agendada: { etapa: "visita_agendada" },
    proposta: { etapa: "proposta" },
    fechado: { filtro: "encerrados", etapa: "fechado" },
  };
  const lostTotal = f.lost.reduce((s, [, n]) => s + n, 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {f.steps.map((s, i) => (
          <Link key={s.key} href={leadsHref(stageParam[s.key])} className="grid content-start gap-1 rounded-[20px] bg-white p-4 hover:outline hover:outline-1 hover:outline-black">
            <span className="flex items-center justify-between text-[12.5px] text-muted">
              {s.label} <span aria-hidden>›</span>
            </span>
            <span className="text-[28px] font-light">{s.count}</span>
            <span className="text-[12px] font-semibold text-muted">{i === 0 ? "entrada do funil" : s.ofPrev === null ? "—" : `${pct(s.ofPrev)} da etapa anterior`}</span>
          </Link>
        ))}
      </div>
      <p className="-mt-2 text-[12px] text-muted-2">Leads que chegaram no período e alcançaram cada etapa (mesmo que depois tenham sido perdidos).</p>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Tempo médio em cada etapa">
          {f.durations.length ? (
            <div>
              {f.durations.map((d) => (
                <Line key={d.key} label={d.label} value={fmtLong(d.avgMs)} />
              ))}
            </div>
          ) : (
            <Empty text="O app começou a registrar as mudanças de etapa agora. Os tempos aparecem conforme os leads avançam." />
          )}
        </Panel>
        <Panel title="Motivos de perda">
          {f.lost.length ? (
            <div className="grid gap-1">
              {f.lost.map(([reason, n]) => (
                <Meter
                  key={reason}
                  label={LOST_REASON_LABELS[reason as keyof typeof LOST_REASON_LABELS] ?? reason}
                  value={String(n)}
                  share={n / lostTotal}
                  href={leadsHref({ filtro: "encerrados", motivo: reason })}
                />
              ))}
            </div>
          ) : (
            <Empty text="Nenhum lead perdido no período." />
          )}
        </Panel>
        <Panel title="Visitas e propostas">
          <div>
            <Line label="Visitas confirmadas" value={f.visits.confirmed} />
            <Line label="Realizadas" value={f.visits.done} />
            <Line label="Não compareceu" value={f.visits.noShow} />
            <Line label="Propostas recebidas" value={f.visits.proposals} />
            <Line label="Contrapropostas" value={f.visits.counter} />
            <Line label="Aceitas" value={f.visits.accepted} />
          </div>
        </Panel>
      </div>
    </>
  );
}

function Properties({ m }: { m: Metrics }) {
  const p = m.properties;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Visualizações" value={String(p.views)} delta={deltaCount(p.views, p.viewsPrev)} help="Clientes diferentes que abriram a ficha pela primeira vez no período. A imobiliária vê só o total, nunca quem viu." />
        <Kpi label="Salvos" value={String(p.saves)} delta={deltaCount(p.saves, p.savesPrev)} help="Quantas vezes os imóveis foram salvos no período. Só o total, nunca quem salvou." />
        <Kpi label="Leads gerados" value={String(p.leads)} delta={deltaCount(p.leads, p.leadsPrev)} />
        <Kpi label="Com selo Anúncio completo" value={`${p.sealed} de ${p.published}`} note={p.published ? pct(p.sealed / p.published) : undefined} />
      </div>
      <Panel title="Desempenho por imóvel">
        {p.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-muted">
                  <th className="py-2 font-semibold">Imóvel</th>
                  <th className="py-2 pl-4 text-right font-semibold">Visualizações</th>
                  <th className="py-2 pl-4 text-right font-semibold">Salvos</th>
                  <th className="py-2 pl-4 text-right font-semibold">Leads</th>
                  <th className="py-2 pl-4 text-right font-semibold">Visitas realizadas</th>
                  <th className="py-2 pl-4 font-semibold">Selo</th>
                </tr>
              </thead>
              <tbody>
                {p.rows.map((r) => (
                  <tr key={r.id} className="border-t border-paper-2">
                    <td className="py-2.5 font-semibold">
                      <Link href={`/painel/imoveis/${r.id}`} className="hover:underline">
                        {r.title} <span className="text-muted">›</span>
                      </Link>
                    </td>
                    <td className="py-2.5 pl-4 text-right">{r.views}</td>
                    <td className="py-2.5 pl-4 text-right">{r.saves}</td>
                    <td className="py-2.5 pl-4 text-right">{r.leads}</td>
                    <td className="py-2.5 pl-4 text-right">{r.visits}</td>
                    <td className="py-2.5 pl-4">{r.seal ? <Icon name="check" size="sm" label="Com selo" /> : <span aria-label="Sem selo">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="Publique imóveis para acompanhar o desempenho." />
        )}
      </Panel>
      {p.sealRatio !== null && p.sealRatio > 1 ? (
        <p className="flex items-start gap-2.5 rounded-[20px] bg-white p-4 text-[13px]">
          <Icon name="info" size="sm" className="mt-0.5 flex-none" />
          <span>
            Imóveis com selo receberam <b>{String(Math.round(p.sealRatio * 10) / 10).replace(".", ",")}×</b> mais leads por visualização neste período. Completar o anúncio é o
            jeito mais simples de aparecer melhor.
          </span>
        </p>
      ) : null}
    </>
  );
}

function Ai({ m }: { m: Metrics }) {
  const a = m.ai;
  // Para descartadas, menos é melhor.
  const inverse = (d: Delta): Delta => (d && d.good !== null ? { ...d, good: !d.good } : d);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Sugestões aprovadas sem edição" value={pct(a.approved)} delta={deltaPoints(a.approved, a.approvedPrev)} />
        <Kpi label="Editadas antes de enviar" value={pct(a.edited)} />
        <Kpi label="Descartadas" value={pct(a.discarded)} delta={inverse(deltaPoints(a.discarded, a.discardedPrev))} />
        <Kpi label="Leads atendidos pela assistente" value={String(a.served)} note={a.servedShare === null ? undefined : `${pct(a.servedShare)} dos leads`} />
      </div>
      {a.decided === 0 ? <p className="-mt-2 text-[12px] text-muted-2">Nenhuma sugestão da IA decidida no período.</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Assistente virtual · ${a.assistantName}`}>
          <div>
            <Line label="Perguntas respondidas pelos clientes" value={a.answers} />
            <Line label="Clientes que responderam todas" value={`${a.completed} de ${a.served}`} />
            <Line label="Dúvidas passadas ao corretor" value={a.forwarded} />
          </div>
          <p className="text-[11.5px] text-muted-2">As respostas da assistente às dúvidas sobre a ficha entram aqui quando a IA estiver ligada.</p>
        </Panel>
        <Panel title="Respostas por pergunta">
          {a.served && a.perQuestion.length ? (
            <div className="grid gap-1">
              {a.perQuestion.map((q) => (
                <Meter key={q.id} label={q.text} value={pct(q.share)} share={q.share ?? 0} href="/painel/assistente" />
              ))}
              <p className="text-[11.5px] text-muted-2">Pergunta com pouca resposta pode estar cansando o cliente.</p>
            </div>
          ) : (
            <Empty text={a.assistantEnabled ? "A assistente ainda não atendeu leads neste período." : "A assistente virtual está desligada."} />
          )}
        </Panel>
      </div>
    </>
  );
}
