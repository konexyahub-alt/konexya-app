import { readWeights, type ScoredProperty, type Weights } from "@/lib/scoring";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Supabase = SupabaseClient<Database>;

/** Colunas que a nota e os cartões de recomendação usam. */
export const RECOMMENDATION_COLUMNS =
  "id, purpose, type, price, bedrooms, parking_spots, pets, neighborhood, amenities, has_seal, title, area_m2, property_photos(storage_path, source_url, position, is_cover, alt_text)";

export type RecommendationProperty = ScoredProperty & {
  title: string | null;
  area_m2: number | null;
  property_photos: {
    storage_path: string | null;
    source_url: string | null;
    position: number;
    is_cover: boolean;
    alt_text: string | null;
  }[];
};

export type ScoringSettings = { weights: Weights; sealBonus: number };

export async function loadScoringSettings(supabase: Supabase): Promise<ScoringSettings> {
  const { data } = await supabase
    .from("platform_settings")
    .select("score_weights, seal_rank_bonus")
    .eq("id", 1)
    .maybeSingle();
  return { weights: readWeights(data?.score_weights), sealBonus: data?.seal_rank_bonus ?? 2 };
}
