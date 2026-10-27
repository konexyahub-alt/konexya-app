import type { Database } from "@/lib/supabase/database.types";

export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type PropertyPhoto = Database["public"]["Tables"]["property_photos"]["Row"];
export type PropertyType = Database["public"]["Enums"]["property_type"];
export type PropertyStatus = Database["public"]["Enums"]["property_status"];
export type PetsPolicy = Database["public"]["Enums"]["pets_policy"];
export type Purpose = Database["public"]["Enums"]["property_purpose"];

export const TYPE_LABELS: Record<PropertyType, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  cobertura: "Cobertura",
  studio: "Studio",
  sala_comercial: "Sala comercial",
  terreno: "Terreno",
};

export const PURPOSE_LABELS: Record<Purpose, string> = { venda: "Venda", aluguel: "Aluguel" };

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  pausado: "Pausado",
  vendido: "Vendido",
  alugado: "Alugado",
};

export const STATUS_TONES: Record<PropertyStatus, "neutral" | "ok" | "warn" | "dark"> = {
  rascunho: "neutral",
  publicado: "ok",
  pausado: "warn",
  vendido: "dark",
  alugado: "dark",
};

export const PETS_LABELS: Record<PetsPolicy, string> = {
  nao: "Não aceita pets",
  pequeno: "Aceita pets pequenos",
  qualquer: "Aceita pets de qualquer porte",
};

/** Itens do prédio oferecidos no cadastro (caixas de seleção). */
export const AMENITIES = [
  "Piscina",
  "Academia",
  "Salão de festas",
  "Playground",
  "Pet place",
  "Bicicletário",
  "Portaria 24 h",
  "Elevador",
  "Churrasqueira",
  "Quadra",
  "Espaço gourmet",
  "Gerador",
] as const;

export type SealRules = { minPhotos: number; minDescriptionChars: number };
export const DEFAULT_SEAL_RULES: SealRules = { minPhotos: 5, minDescriptionChars: 200 };

export type SealInput = Pick<
  Property,
  "area_m2" | "price" | "condo_fee" | "iptu_monthly" | "description" | "pin_confirmed"
> & { photoCount: number };

export type SealItem = { key: string; label: string; done: boolean };

/**
 * Checklist do selo "Anúncio completo" (regra 9). Espelha public.compute_property_seal no banco,
 * que é a fonte da verdade; aqui serve para mostrar ao anunciante o que falta.
 */
export function sealChecklist(p: SealInput, rules: SealRules = DEFAULT_SEAL_RULES): SealItem[] {
  return [
    { key: "fotos", label: `${rules.minPhotos} fotos ou mais`, done: p.photoCount >= rules.minPhotos },
    {
      key: "valores",
      label: "Metragem, valor, condomínio e IPTU",
      done: p.area_m2 !== null && p.price !== null && p.condo_fee !== null && p.iptu_monthly !== null,
    },
    {
      key: "descricao",
      label: `Descrição com ${rules.minDescriptionChars} caracteres ou mais`,
      done: (p.description ?? "").trim().length >= rules.minDescriptionChars,
    },
    { key: "pino", label: "Pino confirmado no mapa", done: p.pin_confirmed },
  ];
}

export function missingSealItems(items: SealItem[]): number {
  return items.filter((i) => !i.done).length;
}

export function photoUrl(photo: Pick<PropertyPhoto, "storage_path" | "source_url">, supabaseUrl: string): string {
  if (photo.source_url) return photo.source_url;
  return `${supabaseUrl}/storage/v1/object/public/imoveis/${photo.storage_path}`;
}

export function sortPhotos<T extends Pick<PropertyPhoto, "position" | "is_cover">>(photos: T[]): T[] {
  return [...photos].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position);
}

export function propertyAddress(p: Pick<Property, "street" | "street_number" | "neighborhood" | "city">): string {
  const line = [p.street, p.street_number].filter(Boolean).join(", ");
  return [line, p.neighborhood, p.city].filter(Boolean).join(" · ");
}
