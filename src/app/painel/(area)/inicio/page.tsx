import Link from "next/link";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/panel/auto-refresh";
import { buttonClasses, EmptyState, HelpTip, Icon, Skeleton, Tag } from "@/components/ui";
import { requireApprovedMember } from "@/lib/auth";
import { OPEN_STAGES, STAGE_LABELS, formatDuration, nowMs, timeAgo } from "@/lib/leads";
import { loadLeadCards } from "@/lib/panel-leads";

/** P-02 · Painel: o que precisa de ação hoje, em 10 segundos. */
export default function DashboardPage() {
  return (
    <main className="grid gap-6 px-4 py-6 lg:px-9 lg:py-7">
      <Suspense fallback={<Skeleton className="h-[420px] rounded-[20px]" />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

const TZ = "America/Fortaleza";

async function Dashboard() {
  const { membership } = await requireApprovedMember("/painel/inicio");
  const cards = await loadLeadCards(membership.agencyId);
  const now = nowMs();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  const isToday = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ }) === today;

  const open = cards.filter((c) => !c.revoked && OPEN_STAGES.includes(c.stage));
  const newToday = cards.filter((c) => isToday(c.createdAt)).length;
  const awaiting = open.filter((c) => c.awaiting);
  const stalled = open.filter((c) => c.stalled).length;
  const answered = cards.filter((c) => c.firstResponseAt && now - new Date(c.createdAt).getTime() <= 30 * 86400_000);
  const avgMs = answered.length
    ? answered.reduce((s, c) => s + (new Date(c.firstResponseAt!).getTime() - new Date(c.createdAt).getTime()), 0) / answered.length
    : null;
  const fresh = awaiting.find((c) => !c.firstResponseAt && now - new Date(c.createdAt).getTime() < 30 * 60_000);
  const max = Math.max(1, ...OPEN_STAGES.map((s) => open.filter((c) => c.stage === s).length));
  const date = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });

  return (
    <>
      <AutoRefresh ms={15000} />
      <div>
        <p className="trk">Painel</p>
        <h1 className="mt-1 text-[28px] font-light tracking-tight">
          Bom atendimento, <b className="font-bold">{membership.name.split(/\s+/)[0]}</b>.
        </h1>
        <p className="text-[13px] text-muted">
          {date.charAt(0).toUpperCase() + date.slice(1)} · visão geral do atendimento
        </p>
      </div>

      {fresh ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[20px] bg-black p-4 text-white">
          <Icon name="bell" />
          <p className="flex-1 text-[14px]">
            <b>{fresh.name}</b> acabou de chegar · {fresh.search}
          </p>
          <Link href={`/painel/leads/${fresh.id}`} className={buttonClasses({ variant: "inverse", size: "sm" })}>
            Abrir lead
          </Link>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Números do atendimento">
        {[
          { label: "Leads novos hoje", value: String(newToday) },
          { label: "Aguardando resposta", value: String(awaiting.length) },
          {
            label: "Parados há mais de 48 h",
            value: String(stalled),
            bad: stalled > 0,
            help: "Leads em aberto em que ninguém, nem o cliente nem a imobiliária, mandou mensagem nas últimas 48 horas. Lead parado esfria: são os primeiros a retomar.",
          },
          {
            label: "Tempo médio até a primeira resposta",
            value: avgMs === null ? "—" : formatDuration(avgMs),
            hint: avgMs === null ? "Ainda sem respostas nos últimos 30 dias" : "Últimos 30 dias",
            help: "Do momento em que o cliente autoriza o perfil até a primeira mensagem enviada ou aprovada por um corretor. As mensagens automáticas da assistente virtual não contam.",
          },
        ].map((n) => (
          <div key={n.label} className="grid gap-1 rounded-[20px] bg-white p-[18px] shadow-soft">
            <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
              {n.label}
              {"help" in n && n.help ? <HelpTip label={n.label}>{n.help}</HelpTip> : null}
            </span>
            <span className={`num text-[30px] font-bold tracking-tight ${n.bad ? "text-bad" : ""}`}>{n.value}</span>
            {n.hint ? <span className="text-[11px] text-muted-2">{n.hint}</span> : null}
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="grid content-start gap-3 rounded-[20px] bg-white p-[18px] shadow-soft">
          <h2 className="trk">Aguardando você</h2>
          {awaiting.length ? (
            <ul className="grid gap-2">
              {awaiting.slice(0, 8).map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-[14px] bg-paper p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold">{c.name}</p>
                    <p className="truncate text-[11.5px] text-muted">
                      {c.firstResponseAt
                        ? "Responder a dúvida encaminhada pela assistente"
                        : c.hasSuggestion
                          ? "Revisar e aprovar a primeira mensagem"
                          : "Enviar a primeira mensagem"}{" "}
                      · chegou {timeAgo(c.createdAt)}
                    </p>
                  </div>
                  {c.stalled ? <Tag tone="bad">48 h+</Tag> : null}
                  <Link href={`/painel/leads/${c.id}`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                    Abrir
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={cards.length ? "Nada esperando por você agora." : "Nenhum lead ainda."}
              description={
                cards.length
                  ? "Quando um cliente escrever ou um lead novo chegar, ele aparece aqui."
                  : "Os leads chegam quando um cliente autoriza o compartilhamento do perfil num imóvel de vocês."
              }
            />
          )}
        </section>

        <section className="grid content-start gap-3 rounded-[20px] bg-white p-[18px] shadow-soft">
          <h2 className="trk">Funil resumido</h2>
          <ul className="grid gap-2.5">
            {OPEN_STAGES.map((s) => {
              const n = open.filter((c) => c.stage === s).length;
              return (
                <li key={s} className="grid gap-1">
                  <span className="flex justify-between text-[12.5px]">
                    {STAGE_LABELS[s]}
                    <b className="num">{n}</b>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-paper-2">
                    <span className="block h-full rounded-full bg-black" style={{ width: `${(n / max) * 100}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
          <Link href="/painel/funil" className="min-h-touch text-[12.5px] font-semibold underline underline-offset-4">
            Abrir o funil
          </Link>
        </section>
      </div>
    </>
  );
}
