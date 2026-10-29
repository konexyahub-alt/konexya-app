import { Suspense } from "react";
import { TabBar } from "@/components/client/tab-bar";
import { Skeleton } from "@/components/ui";
import { requireReadyClient } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { shortBRL, toProfile } from "@/lib/profile";
import { TYPE_LABELS, photoUrl, sortPhotos } from "@/lib/property";
import { RECOMMENDATION_COLUMNS, loadScoringSettings, type RecommendationProperty } from "@/lib/recommendations";
import { scoreProperty } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";
import { SavedList, type SavedItem } from "./saved-list";

/** C-09 · Salvos: os imóveis que o cliente salvou, com a nota do perfil, e a escolha para comparar. */
export default function SavedPage({ searchParams }: PageProps<"/app/salvos">) {
  return (
    <>
      <main className="grid grid-cols-[minmax(0,1fr)] content-start gap-4 px-4 pb-6 pt-[max(20px,env(safe-area-inset-top))]">
        <div>
          <p className="trk">Salvos</p>
          <h1 className="mt-1 text-[30px] font-light tracking-tight">
            Seus <b className="font-bold">favoritos</b>
          </h1>
        </div>
        <Suspense fallback={<Skeleton className="h-[300px] rounded-[20px]" />}>
          <Saved searchParams={searchParams} />
        </Suspense>
      </main>
      <TabBar active="Salvos" />
    </>
  );
}

async function Saved({ searchParams }: Pick<PageProps<"/app/salvos">, "searchParams">) {
  const { user } = await requireReadyClient("/app/salvos");
  const supabase = await createClient();
  const [{ data: saved }, { data: row }, settings, params] = await Promise.all([
    supabase.rpc("my_saved_properties"),
    supabase.from("client_profiles").select("*").eq("user_id", user.id).single(),
    loadScoringSettings(supabase),
    searchParams,
  ]);
  const list = saved ?? [];
  const availableIds = list.filter((s) => s.available).map((s) => s.property_id);
  const { data: props } = availableIds.length
    ? await supabase.from("properties").select(RECOMMENDATION_COLUMNS).in("id", availableIds).returns<RecommendationProperty[]>()
    : { data: [] as RecommendationProperty[] };
  const profile = toProfile(row);
  const base = publicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const items: SavedItem[] = list.map((s) => {
    const p = (props ?? []).find((x) => x.id === s.property_id);
    const result = p ? scoreProperty(p, profile, settings.weights) : null;
    const cover = p ? sortPhotos(p.property_photos)[0] : undefined;
    const budget = result?.reasons.find((r) => r.criterion === "orcamento");
    return {
      id: s.property_id,
      title: s.title ?? TYPE_LABELS[s.type],
      line: [s.neighborhood, s.price !== null ? shortBRL(Number(s.price)) : null].filter(Boolean).join(" · "),
      photoUrl: cover ? photoUrl(cover, base) : null,
      available: !!p,
      score: result?.score ?? null,
      budget: budget ? { band: budget.band, text: budget.text.replace(" informado", "") } : null,
    };
  });
  return <SavedList items={items} startComparing={params.comparar === "1"} />;
}
