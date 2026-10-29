import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, Icon, Skeleton, Tag, buttonClasses } from "@/components/ui";
import { requireDraftingMember } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { formatBRL } from "@/lib/format";
import { STATUS_LABELS, STATUS_TONES, TYPE_LABELS, photoUrl, sortPhotos, type PropertyStatus } from "@/lib/property";
import { createClient } from "@/lib/supabase/server";
import { createDraft } from "./actions";
import { PropertyFilters } from "./filters";

/** P-06 · Imóveis anunciados. */
export default function PropertiesPage({ searchParams }: PageProps<"/painel/imoveis">) {
  return (
    <main className="grid gap-5 px-4 py-6 lg:px-9 lg:py-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Imóveis anunciados</h1>
          <p className="text-[13px] text-muted">Cadastre, importe e acompanhe o selo de cada anúncio.</p>
        </div>
        <div className="flex gap-2.5">
          <Link href="/painel/imoveis/importar" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Importar planilha
          </Link>
          <form action={createDraft}>
            <button type="submit" className={buttonClasses({ size: "sm" })}>
              Novo imóvel
            </button>
          </form>
        </div>
      </div>
      <Suspense fallback={<Skeleton className="h-11 w-full max-w-xl" />}>
        <PropertyFilters />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <List searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const STATUSES = Object.keys(STATUS_LABELS) as PropertyStatus[];

async function List({ searchParams }: Pick<PageProps<"/painel/imoveis">, "searchParams">) {
  const { membership } = await requireDraftingMember("/painel/imoveis");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" && STATUSES.includes(params.status as PropertyStatus) ? params.status : "";
  const selo = params.selo === "sim" ? true : params.selo === "nao" ? false : null;

  const supabase = await createClient();
  let query = supabase
    .from("properties")
    .select("id, title, type, neighborhood, price, area_m2, purpose, status, has_seal, external_ref, property_photos(storage_path, source_url, position, is_cover)")
    .eq("agency_id", membership.agencyId)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (status) query = query.eq("status", status as PropertyStatus);
  if (selo !== null) query = query.eq("has_seal", selo);
  if (q) {
    const term = q.replace(/[%,()]/g, " ");
    query = query.or(`title.ilike.%${term}%,neighborhood.ilike.%${term}%,street.ilike.%${term}%,external_ref.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  const { NEXT_PUBLIC_SUPABASE_URL } = publicEnv();

  if (!data.length) {
    return q || status || selo !== null ? (
      <EmptyState title="Nenhum imóvel com esses filtros." description="Mude ou limpe os filtros para ver todos." />
    ) : (
      <EmptyState
        title="Nenhum imóvel cadastrado ainda."
        description="Cadastre um imóvel ou importe vários de uma vez pela planilha modelo."
        action={
          <Link href="/painel/imoveis/importar" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Importar planilha
          </Link>
        }
      />
    );
  }

  const rows = data.map((p) => {
    const cover = sortPhotos(p.property_photos)[0];
    const pricePerM2 = p.purpose === "venda" && p.price && p.area_m2 ? Number(p.price) / Number(p.area_m2) : null;
    return {
      ...p,
      name: p.title ?? `${TYPE_LABELS[p.type]} sem nome`,
      cover: cover ? photoUrl(cover, NEXT_PUBLIC_SUPABASE_URL) : null,
      priceLabel: p.price ? `${formatBRL(p.price)}${p.purpose === "aluguel" ? "/mês" : ""}` : "—",
      pricePerM2: pricePerM2 ? formatBRL(pricePerM2) : "—",
    };
  });

  return (
    <>
      <p className="text-[13px] text-muted">{rows.length === 1 ? "1 imóvel" : `${rows.length} imóveis`}</p>
      {/* Computador: tabela */}
      <div className="hidden overflow-x-auto rounded-[20px] bg-white px-2 shadow-soft lg:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted-2">
              <th className="px-2.5 py-2.5">Imóvel</th>
              <th className="px-2.5 py-2.5">Bairro</th>
              <th className="px-2.5 py-2.5 text-right">Preço</th>
              <th className="px-2.5 py-2.5 text-right">Preço/m²</th>
              <th className="px-2.5 py-2.5">Selo</th>
              <th className="px-2.5 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-paper-2 hover:bg-paper">
                <td className="px-2.5 py-2.5">
                  <Link href={`/painel/imoveis/${p.id}`} className="flex items-center gap-2.5 font-bold">
                    <Thumb url={p.cover} />
                    <span>
                      {p.name}
                      {p.external_ref ? <span className="block text-xs font-normal text-muted-2">Código {p.external_ref}</span> : null}
                    </span>
                  </Link>
                </td>
                <td className="px-2.5 py-2.5 text-muted">{p.neighborhood ?? "—"}</td>
                <td className="num whitespace-nowrap px-2.5 py-2.5 text-right">{p.priceLabel}</td>
                <td className="num whitespace-nowrap px-2.5 py-2.5 text-right text-muted">{p.pricePerM2}</td>
                <td className="px-2.5 py-2.5">
                  {p.has_seal ? (
                    <Tag tone="ok">
                      <Icon name="check" className="size-3" /> Selo
                    </Tag>
                  ) : (
                    <span className="text-xs text-muted-2">Faltam itens</span>
                  )}
                </td>
                <td className="px-2.5 py-2.5">
                  <Tag tone={STATUS_TONES[p.status]}>{STATUS_LABELS[p.status]}</Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Celular: cartões */}
      <ul className="grid gap-3 lg:hidden">
        {rows.map((p) => (
          <li key={p.id}>
            <Link href={`/painel/imoveis/${p.id}`} className="flex gap-3 rounded-card border border-line p-3 hover:border-black">
              <Thumb url={p.cover} large />
              <span className="grid min-w-0 content-start gap-1">
                <b className="truncate text-[13px]">{p.name}</b>
                <span className="text-xs text-muted">
                  {p.neighborhood ?? "Sem bairro"} · {p.priceLabel}
                </span>
                <span className="flex gap-1.5">
                  {p.has_seal ? <Tag tone="ok">Selo</Tag> : null}
                  <Tag tone={STATUS_TONES[p.status]}>{STATUS_LABELS[p.status]}</Tag>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function Thumb({ url, large }: { url: string | null; large?: boolean }) {
  const size = large ? "size-[72px] rounded-[10px]" : "h-10 w-[52px] rounded-lg";
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={`${size} flex-none object-cover`} />
  ) : (
    <span className={`${size} flex-none bg-paper-2`} aria-hidden />
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
