import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, Icon, ScoreRing, Skeleton, YMark, buttonClasses } from "@/components/ui";
import { requireReadyClient } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { compareAnalysis, compareRows, type CompareProperty, type Row } from "@/lib/compare";
import { publicEnv } from "@/lib/env";
import { toProfile } from "@/lib/profile";
import { photoUrl, sortPhotos } from "@/lib/property";
import { loadScoringSettings } from "@/lib/recommendations";
import { scoreProperty } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";

/** C-08 · Comparar 2 ou 3 imóveis, com a tabela moldada pelo perfil e a análise da Konexya embaixo. */
export default function ComparePage({ searchParams }: PageProps<"/app/salvos/comparar">) {
  return (
    <Suspense fallback={<Skeleton className="m-4 h-[520px] rounded-[20px]" />}>
      <Compare searchParams={searchParams} />
    </Suspense>
  );
}

const LETTERS = ["A", "B", "C"];
const COLUMNS = "id, purpose, type, price, bedrooms, parking_spots, pets, neighborhood, amenities, has_seal, title, area_m2, condo_fee, iptu_monthly, property_photos(storage_path, source_url, position, is_cover)";

async function Compare({ searchParams }: Pick<PageProps<"/app/salvos/comparar">, "searchParams">) {
  const { user } = await requireReadyClient("/app/salvos");
  const params = await searchParams;
  const raw = Array.isArray(params.ids) ? params.ids[0] : params.ids;
  const ids = [...new Set((raw ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/i.test(x)))].slice(0, 3);
  const supabase = await createClient();
  const [{ data: rows }, { data: profileRow }, settings] = await Promise.all([
    ids.length ? supabase.from("properties").select(COLUMNS).in("id", ids) : Promise.resolve({ data: [] }),
    supabase.from("client_profiles").select("*").eq("user_id", user.id).single(),
    loadScoringSettings(supabase),
  ]);
  // Mantém a ordem escolhida; imóvel que saiu do ar não volta (o RLS só mostra publicados).
  const props = ids.map((id) => (rows ?? []).find((r) => r.id === id)).filter((p): p is NonNullable<typeof p> => !!p);

  const header = (n: number) => (
    <header className="flex items-center gap-3 px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
      <Link href="/app/salvos" aria-label="Voltar para os salvos" className="-ml-2 grid size-touch place-items-center">
        <Icon name="back" />
      </Link>
      <div>
        <h1 className="text-[19px] font-bold">Comparar imóveis</h1>
        {n ? <p className="text-[12px] text-muted">{n} imóveis · com base no seu perfil</p> : null}
      </div>
    </header>
  );
  if (props.length < 2) {
    return (
      <>
        {header(0)}
        <EmptyState
          className="mx-4"
          title="Escolha pelo menos 2 imóveis disponíveis."
          description="Algum imóvel pode ter saído do ar."
          action={
            <Link href="/app/salvos?comparar=1" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Escolher nos salvos
            </Link>
          }
        />
      </>
    );
  }

  const profile = toProfile(profileRow);
  const list = props as unknown as CompareProperty[];
  const { main, details } = compareRows(list, profile);
  const analysis = compareAnalysis(list, profile, settings.weights);
  const base = publicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const letterOf = (id: string) => LETTERS[props.findIndex((p) => p.id === id)];
  const cols = { gridTemplateColumns: `78px repeat(${props.length}, minmax(0, 1fr))` };

  return (
    <>
      {header(props.length)}
      <main className="grid grid-cols-[minmax(0,1fr)] content-start gap-3 px-4 pb-4">
        <div className="grid gap-2" style={cols}>
          <span />
          {props.map((p, i) => {
            const cover = sortPhotos(p.property_photos)[0];
            const score = scoreProperty(p, profile, settings.weights)?.score ?? null;
            return (
              <Link key={p.id} href={`/app/imoveis/${p.id}`} className="grid justify-items-start gap-1.5">
                <span className="aspect-[4/3] w-full overflow-hidden rounded-[12px] bg-paper-2">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl(cover, base)} alt={p.title ?? ""} className="size-full object-cover" />
                  ) : null}
                </span>
                <span className="w-full truncate text-[12.5px] font-bold">
                  {LETTERS[i]} · {p.neighborhood}
                </span>
                {score !== null ? <ScoreRing score={score} size={40} /> : null}
              </Link>
            );
          })}
        </div>

        <Table rows={main} cols={cols} />
        {details.length ? (
          <details className="group rounded-[16px] bg-white">
            <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between px-3 text-[13px] font-semibold">
              Ver todos os detalhes
              <Icon name="back" size="sm" className="-rotate-90 transition-transform group-open:rotate-90" />
            </summary>
            <Table rows={details} cols={cols} flat />
          </details>
        ) : null}

        <section aria-label="Análise da Konexya" className="grid gap-2.5 rounded-[20px] bg-white p-4 shadow-[0_8px_24px_rgb(11_11_12/0.06)]">
          <p className="trk flex items-center gap-1.5">
            <YMark className="h-3.5" /> Análise da Konexya
          </p>
          {analysis.headline ? (
            <p className="text-[14.5px] leading-snug">
              Para o que você contou, o <b>{analysis.headline.title}</b> {analysis.headline.text}
            </p>
          ) : null}
          {analysis.others.map((o) => (
            <p key={o.id} className="text-[12.5px] text-muted">
              <b className="text-ink">
                {letterOf(o.id)} · {o.title}:
              </b>{" "}
              {o.text}
            </p>
          ))}
          {analysis.invite ? (
            <p className="text-[12.5px]">
              {analysis.invite}{" "}
              <Link href="/app" className="font-semibold underline underline-offset-4">
                Contar na conversa
              </Link>
            </p>
          ) : null}
          <p className="text-[11.5px] text-muted-2">Feita pela Konexya só com os dados dos anúncios e do seu perfil. A nota é calculada pelo app.</p>
        </section>
      </main>
      <div className="sticky bottom-0 z-20 mt-auto grid grid-cols-2 gap-2.5 bg-paper px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
        <Link href="/app/salvos?comparar=1" className={buttonClasses({ variant: "secondary", fullWidth: true })}>
          Trocar
        </Link>
        {analysis.headline ? (
          <Link href={`/app/imoveis/${analysis.headline.id}`} className={buttonClasses({ fullWidth: true })}>
            Falar sobre o {letterOf(analysis.headline.id)}
          </Link>
        ) : (
          <Link href="/app" className={buttonClasses({ fullWidth: true })}>
            Completar perfil
          </Link>
        )}
      </div>
    </>
  );
}

function Table({ rows, cols, flat }: { rows: Row[]; cols: React.CSSProperties; flat?: boolean }) {
  return (
    <dl className={cn("grid", !flat && "rounded-[16px] bg-white")}>
      {rows.map((r) => (
        <div key={r.key} className="grid gap-1.5 border-b border-paper-2 px-2.5 py-2.5 text-[12px] last:border-b-0" style={cols}>
          <dt className="font-semibold text-muted">{r.label}</dt>
          {r.cells.map((c, i) => (
            <dd
              key={i}
              className={cn(
                "flex min-w-0 items-start gap-1",
                c.best && "font-bold",
                c.tone === "ok" ? "" : c.tone === "warn" ? "text-warn" : c.tone === "bad" ? "text-bad" : "",
              )}
            >
              {c.tone ? <Icon name={c.tone === "ok" ? "check" : "alert"} size="sm" className={cn("mt-px flex-none", c.tone === "ok" && "text-ok")} /> : null}
              <span className="min-w-0 hyphens-auto" lang="pt-BR">{c.text}</span>
            </dd>
          ))}
        </div>
      ))}
    </dl>
  );
}
