import Link from "next/link";
import { after } from "next/server";
import { Suspense } from "react";
import { buttonClasses, Card, EmptyState, HelpTip, Icon, IconButton, ScoreRing, Skeleton, Tag } from "@/components/ui";
import { PhotoGallery } from "@/components/property/photo-gallery";
import { requireReadyClient } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { formatBRL, formatNumber, plural } from "@/lib/format";
import { toProfile } from "@/lib/profile";
import { PETS_LABELS, TYPE_LABELS, photoUrl, sortPhotos } from "@/lib/property";
import { loadScoringSettings } from "@/lib/recommendations";
import { scoreProperty } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";
import { ContactBar, FavoriteButton } from "./property-actions";

/** C-07 · Ficha do imóvel: fotos, valores, nota explicada por critério e "Falar com o corretor". */
export default function PropertyPage({ params }: PageProps<"/app/imoveis/[id]">) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<FichaSkeleton />}>
        <Ficha params={params} />
      </Suspense>
    </main>
  );
}

async function Ficha({ params }: Pick<PageProps<"/app/imoveis/[id]">, "params">) {
  const { id } = await params;
  const { user } = await requireReadyClient(`/app/imoveis/${id}`);
  const supabase = await createClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  const [{ data: p }, { data: info }, { data: profileRow }, { data: saved }, { data: conversations }, settings] = isUuid
    ? await Promise.all([
        supabase.from("properties").select("*, property_photos(*)").eq("id", id).maybeSingle(),
        supabase.rpc("property_public_info", { p_id: id }).maybeSingle(),
        supabase.from("client_profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("favorites").select("property_id").eq("user_id", user.id).eq("property_id", id).maybeSingle(),
        supabase.rpc("my_conversations"),
        loadScoringSettings(supabase),
      ])
    : [{ data: null }, { data: null }, { data: null }, { data: null }, { data: null }, null];

  if (!p || p.status !== "publicado") {
    return (
      <div className="flex flex-1 flex-col gap-4 px-[22px] pt-4">
        <BackButton />
        <EmptyState
          className="mt-10"
          title="Este imóvel não está mais disponível."
          description="Ele foi vendido, alugado ou retirado pela imobiliária."
          action={
            <Link href="/app" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Voltar para a conversa
            </Link>
          }
        />
      </div>
    );
  }

  // Imóveis vistos entram no lead só se o cliente autorizar (lead_property_activity).
  after(async () => {
    await supabase.rpc("mark_property_viewed", { p_property: p.id });
  });
  const profile = toProfile(profileRow);
  const result = settings ? scoreProperty(p, profile, settings.weights) : null;
  const conversation = (conversations ?? []).find((c) => c.agency_id === p.agency_id && !c.revoked);

  const { NEXT_PUBLIC_SUPABASE_URL } = publicEnv();
  const title = p.title ?? TYPE_LABELS[p.type];
  const photos = sortPhotos(p.property_photos).map((f, i) => ({
    url: photoUrl(f, NEXT_PUBLIC_SUPABASE_URL),
    alt: f.alt_text ?? `${title}, foto ${i + 1}`,
  }));
  const attrs = [
    p.bedrooms !== null && { icon: "home" as const, text: plural(p.bedrooms, "quarto", "quartos") },
    p.suites ? { icon: "user" as const, text: plural(p.suites, "suíte", "suítes") } : null,
    p.parking_spots !== null && { icon: "pin" as const, text: plural(p.parking_spots, "vaga", "vagas") },
    p.area_m2 !== null && { icon: "grid" as const, text: `${formatNumber(p.area_m2)} m²` },
    p.pets && { icon: "heart" as const, text: PETS_LABELS[p.pets] },
  ].filter(Boolean) as { icon: "home" | "user" | "pin" | "grid" | "heart"; text: string }[];
  const costs = [
    p.condo_fee !== null && `Condomínio ${formatBRL(p.condo_fee)}`,
    p.iptu_monthly !== null && `IPTU ${formatBRL(p.iptu_monthly)}/mês`,
  ].filter(Boolean);

  return (
    <>
      <div className="relative">
        <PhotoGallery photos={photos} title={title} />
        <div className="absolute inset-x-4 top-3 flex justify-between">
          <BackButton />
          <FavoriteButton propertyId={p.id} saved={!!saved} />
        </div>
      </div>
      <div className="relative -mt-6 grid gap-[18px] rounded-t-[26px] bg-paper px-5 pb-8 pt-6">
        <div className="grid gap-1.5">
          <p className="trk">
            {[TYPE_LABELS[p.type], p.neighborhood].filter(Boolean).join(" · ")}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {info ? (
            <p className="text-[12.5px] text-muted">
              Anunciado por <b className="font-semibold text-ink">{info.agency_name}</b>
              {info.broker_name ? ` · ${info.broker_name}` : ""}
            </p>
          ) : null}
          {p.has_seal ? (
            <span className="flex items-center gap-1.5">
              <Tag tone="ok" className="w-fit">
                <Icon name="check" className="size-3" /> Anúncio completo
              </Tag>
              <HelpTip label="Anúncio completo">
                A imobiliária preencheu tudo o que importa: fotos, metragem, valor, condomínio, IPTU, uma descrição
                detalhada e a localização conferida no mapa. Não é uma avaliação do imóvel.
              </HelpTip>
            </span>
          ) : null}
          <p className="num text-[30px] tracking-tight">
            <span className="font-light">R$ </span>
            <span className="font-bold">{formatBRL(p.price)?.replace(/^R\$\s?/, "")}</span>
            {p.purpose === "aluguel" ? <span className="text-base font-semibold">/mês</span> : null}
          </p>
          {costs.length ? <p className="num text-[13px] text-muted">{costs.join(" · ")}</p> : null}
        </div>

        {result ? (
          <section className="grid gap-4 rounded-[22px] bg-white p-[18px] shadow-card" aria-labelledby="compat">
            <div className="flex items-center gap-3.5">
              <ScoreRing score={result.score} size={72} />
              <div className="grid gap-1">
                <h2 id="compat" className="trk flex items-center gap-1.5">
                  Compatível com a sua vida
                  <HelpTip label="Compatível com a sua vida">
                    O quanto este imóvel bate com o que você contou na conversa: orçamento, tipo, quartos, pets,
                    bairro e o que é mais importante para você. Não é chance de fechar negócio nem avaliação do
                    imóvel. Os motivos abaixo mostram de onde vem a porcentagem.
                  </HelpTip>
                </h2>
                <p className="text-[12.5px] font-semibold">{compatHeadline(result.reasons)}</p>
              </div>
            </div>
            <ul className="grid gap-2.5">
              {result.reasons.map((r) => (
                <li key={r.criterion} className="flex items-start gap-2.5 text-[12.5px] text-[#3d3d3b]">
                  <Icon
                    name={r.band === "ok" ? "check" : "alert"}
                    size="sm"
                    className={r.band === "ok" ? "text-ok" : r.band === "warn" ? "text-warn" : "text-bad"}
                  />
                  {r.text}
                </li>
              ))}
            </ul>
            <p className="text-[11.5px] text-muted-2">
              Nota calculada com os critérios do seu perfil. Tempos de trajeto entram quando o Mapa Vivo chegar.
            </p>
          </section>
        ) : (
          <Link href="/app" className="rounded-[22px] bg-white p-[18px] text-[12.5px] text-muted shadow-card">
            Conte sua rotina na conversa para ver se este imóvel combina com você.
          </Link>
        )}

        {attrs.length ? (
          <ul className="flex flex-wrap gap-2">
            {attrs.map((a) => (
              <li key={a.text} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-2 px-3 text-xs font-semibold">
                <Icon name={a.icon} size="sm" />
                {a.text}
              </li>
            ))}
          </ul>
        ) : null}

        {p.description ? (
          <Section title="Descrição">
            <p className="whitespace-pre-line text-[13px] text-muted">{p.description}</p>
          </Section>
        ) : null}

        {p.amenities.length ? (
          <Section title="No prédio">
            <ul className="flex flex-wrap gap-2">
              {p.amenities.map((a) => (
                <li key={a} className="inline-flex min-h-9 items-center rounded-full border border-line-2 px-3 text-xs font-semibold">
                  {a}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {p.tour_url ? (
          <a
            href={p.tour_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-touch items-center gap-2 text-[13px] font-semibold underline underline-offset-4"
          >
            <Icon name="layers" /> Ver tour virtual
          </a>
        ) : null}

        {info ? (
          <Card className="flex items-center gap-3 p-4">
            <span className="grid size-9 flex-none place-items-center rounded-full bg-black text-xs font-bold text-white">
              {initials(info.agency_name)}
            </span>
            <div className="text-[12px] leading-snug">
              <p className="text-[13px] font-bold">{info.agency_name}</p>
              <p className="text-muted">CRECI {info.agency_creci}</p>
              {info.broker_name ? (
                <p className="text-muted">
                  {info.broker_name}
                  {info.broker_creci ? ` · CRECI ${info.broker_creci}` : ""}
                </p>
              ) : null}
            </div>
          </Card>
        ) : null}

      </div>
      {info ? (
        <ContactBar
          propertyId={p.id}
          propertyTitle={title}
          agencyName={info.agency_name}
          conversationId={conversation?.lead_id ?? null}
        />
      ) : null}
    </>
  );
}

function compatHeadline(reasons: { band: string }[]) {
  const bad = reasons.filter((r) => r.band !== "ok").length;
  if (!bad) return "Atende a tudo o que você pediu.";
  if (bad === 1) return "Atende quase tudo. Um ponto de atenção.";
  return `Atende em parte. ${bad} pontos de atenção.`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-muted">{title}</h2>
      {children}
    </section>
  );
}

function BackButton() {
  return (
    <Link href="/app" aria-label="Voltar">
      <IconButton label="Voltar" tabIndex={-1} className="border-0 bg-paper">
        <Icon name="back" />
      </IconButton>
    </Link>
  );
}

function initials(name: string) {
  return name
    .replace(/\b(ltda|me|eireli|s\/?a)\b\.?/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function FichaSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-[300px] rounded-none" />
      <div className="grid gap-3 px-5">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
      </div>
    </div>
  );
}
