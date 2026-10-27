import Link from "next/link";
import { Suspense } from "react";
import { Card, EmptyState, Icon, IconButton, Skeleton, Tag, buttonClasses } from "@/components/ui";
import { PhotoGallery } from "@/components/property/photo-gallery";
import { requireReadyClient } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { formatBRL, formatNumber, plural } from "@/lib/format";
import { PETS_LABELS, TYPE_LABELS, photoUrl, sortPhotos } from "@/lib/property";
import { createClient } from "@/lib/supabase/server";

/** C-07 · Ficha do imóvel (básica, etapa 1). */
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
  await requireReadyClient(`/app/imoveis/${id}`);
  const supabase = await createClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  const [{ data: p }, { data: info }] = isUuid
    ? await Promise.all([
        supabase.from("properties").select("*, property_photos(*)").eq("id", id).maybeSingle(),
        supabase.rpc("property_public_info", { p_id: id }).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];

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
        <div className="absolute left-4 top-3">
          <BackButton />
        </div>
      </div>
      <div className="grid gap-[18px] px-5 pb-10 pt-[18px]">
        <div className="grid gap-1.5">
          {p.has_seal ? (
            <Tag tone="ok" className="w-fit">
              <Icon name="check" className="size-3" /> Anúncio completo
            </Tag>
          ) : null}
          <h1 className="text-[22px] font-bold">{title}</h1>
          <p className="text-[13px] text-muted">
            {[p.neighborhood, p.city].filter(Boolean).join(" · ")}
          </p>
          <p className="num text-[28px] font-extrabold tracking-tight">
            {formatBRL(p.price)}
            {p.purpose === "aluguel" ? <span className="text-base font-semibold">/mês</span> : null}
          </p>
          {costs.length ? <p className="num text-[13px] text-muted">{costs.join(" · ")}</p> : null}
        </div>

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

        <div className="grid gap-1.5 rounded-[14px] bg-paper px-4 py-3.5">
          <p className="text-[13px] font-semibold">Em breve</p>
          <p className="text-[12.5px] text-muted">
            Logo você vai poder comparar este imóvel com outros salvos e falar com o corretor por aqui.
          </p>
        </div>
      </div>
    </>
  );
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
