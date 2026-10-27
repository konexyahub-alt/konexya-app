import { z } from "zod";
import { AMENITIES } from "./property";

/** "685.000", "685000", "1.234,56", "R$ 780" → número. Vazio → null. */
export function parseBRNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const s = String(value).replace(/R\$|\s|m²/gi, "").trim();
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/\.(?=\d{3}(\D|$))/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

const money = (label: string, { required = false, positive = false } = {}) =>
  z.preprocess(
    parseBRNumber,
    z
      .number({ error: `${label}: use só números, como 685.000.` })
      .nullable()
      .refine((v) => !required || v !== null, `Informe ${label.toLowerCase()}.`)
      .refine((v) => v === null || (positive ? v > 0 : v >= 0), `${label} precisa ser maior que zero.`),
  );

const count = (label: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z
      .number({ error: `${label}: use um número inteiro.` })
      .int(`${label}: use um número inteiro.`)
      .min(0)
      .max(50)
      .nullable(),
  );

const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(max).nullable());

export const stepBasicSchema = z.object({
  purpose: z.enum(["venda", "aluguel"]),
  type: z.enum(["apartamento", "casa", "cobertura", "studio", "sala_comercial", "terreno"]),
  title: optionalText(120),
  street: optionalText(160),
  street_number: optionalText(20),
  complement: optionalText(80),
  neighborhood: optionalText(80),
  postal_code: z.preprocess(
    (v) => (typeof v === "string" && v.replace(/\D/g, "") ? v.replace(/\D/g, "") : null),
    z.string().regex(/^\d{8}$/, "CEP com 8 números.").nullable(),
  ),
  lat: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(-90).max(90).nullable()),
  lng: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(-180).max(180).nullable()),
  pin_confirmed: z.preprocess((v) => v === true || v === "true" || v === "on", z.boolean()),
});

export const stepValuesSchema = z.object({
  price: money("Valor", { positive: true }),
  condo_fee: money("Condomínio"),
  iptu_monthly: money("IPTU mensal"),
  area_m2: money("Área útil", { positive: true }),
  bedrooms: count("Quartos"),
  suites: count("Suítes"),
  bathrooms: count("Banheiros"),
  parking_spots: count("Vagas"),
});

export const stepFeaturesSchema = z.object({
  pets: z.preprocess((v) => (v ? v : null), z.enum(["nao", "pequeno", "qualquer"]).nullable()),
  furnished: z.preprocess((v) => (v === "sim" ? true : v === "nao" ? false : null), z.boolean().nullable()),
  floor: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number({ error: "Andar: use um número." }).int().min(-5).max(200).nullable(),
  ),
  view: optionalText(80),
  amenities: z.array(z.enum(AMENITIES)).default([]),
});

export const stepPhotosSchema = z.object({
  tour_url: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : null),
    z.string().regex(/^https:\/\//, "O link do tour precisa começar com https://").max(500).nullable(),
  ),
});

export const stepDescriptionSchema = z.object({
  description: optionalText(5000),
  broker_id: z.preprocess((v) => (v ? v : null), z.uuid().nullable()),
});

export const STEP_SCHEMAS = [stepBasicSchema, stepValuesSchema, stepFeaturesSchema, stepPhotosSchema, stepDescriptionSchema] as const;
export const STEP_LABELS = ["Básico", "Valores e medidas", "Características", "Fotos", "Descrição"] as const;

/** Mínimo para publicar (o banco também exige). */
export function publishProblems(p: { title: string | null; price: number | null; neighborhood: string | null }): string[] {
  const out: string[] = [];
  if (!p.title) out.push("Dê um nome ao anúncio (passo Básico).");
  if (!p.neighborhood) out.push("Informe o bairro (passo Básico).");
  if (p.price === null) out.push("Informe o valor (passo Valores e medidas).");
  return out;
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}
