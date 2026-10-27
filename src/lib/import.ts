import { z } from "zod";
import { AMENITIES, sealChecklist, missingSealItems, type SealRules } from "./property";
import { parseBRNumber } from "./property-form";

/** Colunas da planilha modelo, na ordem. `key` é o nome normalizado do cabeçalho. */
export const IMPORT_COLUMNS = [
  { key: "codigo", label: "Código", hint: "Seu código interno do imóvel. Usado para atualizar o mesmo imóvel numa nova importação." },
  { key: "nome_do_anuncio", label: "Nome do anúncio", hint: "Ex.: Apartamento com varanda perto do parque" },
  { key: "finalidade", label: "Finalidade", hint: "venda ou aluguel" },
  { key: "tipo", label: "Tipo", hint: "apartamento, casa, cobertura, studio, sala comercial ou terreno" },
  { key: "rua", label: "Rua", hint: "" },
  { key: "numero", label: "Número", hint: "" },
  { key: "complemento", label: "Complemento", hint: "" },
  { key: "bairro", label: "Bairro", hint: "Obrigatório" },
  { key: "cep", label: "CEP", hint: "8 números" },
  { key: "valor", label: "Valor", hint: "Venda: valor total. Aluguel: valor por mês. Obrigatório." },
  { key: "condominio", label: "Condomínio", hint: "Por mês. Use 0 se não houver." },
  { key: "iptu_mensal", label: "IPTU mensal", hint: "Valor anual dividido por 12. Use 0 se for isento." },
  { key: "area_m2", label: "Área útil (m²)", hint: "" },
  { key: "quartos", label: "Quartos", hint: "" },
  { key: "suites", label: "Suítes", hint: "" },
  { key: "banheiros", label: "Banheiros", hint: "" },
  { key: "vagas", label: "Vagas", hint: "" },
  { key: "aceita_pets", label: "Aceita pets", hint: "nao, pequeno ou qualquer" },
  { key: "mobiliado", label: "Mobiliado", hint: "sim ou nao" },
  { key: "andar", label: "Andar", hint: "" },
  { key: "vista", label: "Vista", hint: "Ex.: mar, parque" },
  { key: "itens_do_predio", label: "Itens do prédio", hint: `Separados por ponto e vírgula. Opções: ${AMENITIES.join("; ")}` },
  { key: "descricao", label: "Descrição", hint: "" },
  { key: "link_tour", label: "Link do tour virtual", hint: "Começando com https://" },
  { key: "fotos", label: "Fotos (links)", hint: "Links https separados por ponto e vírgula. A primeira é a capa." },
  { key: "latitude", label: "Latitude", hint: "Opcional. Com latitude e longitude, o pino conta como confirmado." },
  { key: "longitude", label: "Longitude", hint: "Opcional" },
] as const;

export type ImportKey = (typeof IMPORT_COLUMNS)[number]["key"];

export function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Cabeçalhos aceitos: o rótulo da planilha modelo ou a chave. */
const HEADER_MAP = new Map<string, ImportKey>(
  IMPORT_COLUMNS.flatMap((c) => [
    [normalizeHeader(c.label), c.key],
    [c.key, c.key],
  ]),
);
HEADER_MAP.set("area", "area_m2");
HEADER_MAP.set("iptu", "iptu_mensal");
HEADER_MAP.set("nome", "nome_do_anuncio");

export function mapHeaders(headers: string[]): (ImportKey | null)[] {
  return headers.map((h) => HEADER_MAP.get(normalizeHeader(h)) ?? null);
}

const TYPE_ALIASES: Record<string, string> = {
  apartamento: "apartamento",
  apto: "apartamento",
  ap: "apartamento",
  casa: "casa",
  cobertura: "cobertura",
  studio: "studio",
  estudio: "studio",
  kitnet: "studio",
  sala_comercial: "sala_comercial",
  sala: "sala_comercial",
  terreno: "terreno",
  lote: "terreno",
};

const text = (max: number) =>
  z.preprocess((v) => (v === null || v === undefined || String(v).trim() === "" ? null : String(v).trim()), z.string().max(max).nullable());

const money = (label: string, required = false) =>
  z.preprocess(
    parseBRNumber,
    z
      .number({ error: `${label} não é um número` })
      .nullable()
      .refine((v) => !required || v !== null, `${label} vazio`)
      .refine((v) => v === null || v >= 0, `${label} negativo`),
  );

const intField = (label: string, min = 0, max = 50) =>
  z.preprocess(
    (v) => (v === null || v === undefined || String(v).trim() === "" ? null : Number(String(v).replace(",", "."))),
    z.number({ error: `${label} não é um número` }).int(`${label} precisa ser inteiro`).min(min).max(max).nullable(),
  );

const rowSchema = z
  .object({
    codigo: text(60),
    nome_do_anuncio: z.preprocess((v) => (v == null ? "" : String(v).trim()), z.string().min(2, "nome do anúncio vazio").max(120)),
    finalidade: z.preprocess(
      (v) => (v == null || String(v).trim() === "" ? "venda" : normalizeHeader(String(v))),
      z.enum(["venda", "aluguel"], { error: "finalidade deve ser venda ou aluguel" }),
    ),
    tipo: z.preprocess(
      (v) => TYPE_ALIASES[normalizeHeader(String(v ?? ""))] ?? (v == null || String(v).trim() === "" ? "" : `?${String(v).trim()}`),
      z.string().superRefine((v, ctx) => {
        if (!v) ctx.addIssue({ code: "custom", message: "tipo vazio" });
        else if (v.startsWith("?")) ctx.addIssue({ code: "custom", message: `tipo de imóvel não reconhecido: "${v.slice(1)}"` });
      }),
    ),
    rua: text(160),
    numero: text(20),
    complemento: text(80),
    bairro: z.preprocess((v) => (v == null ? "" : String(v).trim()), z.string().min(1, "bairro vazio").max(80)),
    cep: z.preprocess(
      (v) => (v == null || String(v).trim() === "" ? null : String(v).replace(/\D/g, "").padStart(8, "0")),
      z.string().regex(/^\d{8}$/, "CEP inválido").nullable(),
    ),
    valor: money("valor", true).refine((v) => v === null || v > 0, "valor precisa ser maior que zero"),
    condominio: money("condomínio"),
    iptu_mensal: money("IPTU"),
    area_m2: money("área").refine((v) => v === null || v > 0, "área precisa ser maior que zero"),
    quartos: intField("quartos"),
    suites: intField("suítes"),
    banheiros: intField("banheiros"),
    vagas: intField("vagas"),
    aceita_pets: z.preprocess(
      (v) => {
        const s = normalizeHeader(String(v ?? ""));
        if (!s) return null;
        if (["nao", "n", "no"].includes(s)) return "nao";
        if (["pequeno", "pequeno_porte", "sim_pequeno"].includes(s)) return "pequeno";
        if (["qualquer", "sim", "s", "qualquer_porte", "todos"].includes(s)) return "qualquer";
        return `?${s}`;
      },
      z.enum(["nao", "pequeno", "qualquer"], { error: "aceita pets deve ser nao, pequeno ou qualquer" }).nullable(),
    ),
    mobiliado: z.preprocess(
      (v) => {
        const s = normalizeHeader(String(v ?? ""));
        return !s ? null : ["sim", "s"].includes(s) ? true : ["nao", "n"].includes(s) ? false : "?";
      },
      z.boolean({ error: "mobiliado deve ser sim ou nao" }).nullable(),
    ),
    andar: intField("andar", -5, 200),
    vista: text(80),
    itens_do_predio: z.preprocess(
      (v) =>
        String(v ?? "")
          .split(/[;,|]/)
          .map((s) => s.trim())
          .filter(Boolean),
      z.array(z.string()).transform((items) =>
        items
          .map((i) => AMENITIES.find((a) => normalizeHeader(a) === normalizeHeader(i)))
          .filter((a): a is (typeof AMENITIES)[number] => Boolean(a)),
      ),
    ),
    descricao: text(5000),
    link_tour: text(500).refine((v) => v === null || v.startsWith("https://"), "link do tour precisa começar com https://"),
    fotos: z.preprocess(
      (v) =>
        String(v ?? "")
          .split(/[;\s]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      z.array(z.string().regex(/^https:\/\/\S+$/, "link de foto precisa começar com https://")).max(40, "no máximo 40 fotos"),
    ),
    latitude: z.preprocess(parseBRNumber, z.number({ error: "latitude inválida" }).min(-90).max(90).nullable()),
    longitude: z.preprocess(parseBRNumber, z.number({ error: "longitude inválida" }).min(-180).max(180).nullable()),
  })
  .refine((r) => (r.latitude === null) === (r.longitude === null), { message: "informe latitude e longitude juntas", path: ["latitude"] });

export type ImportRow = z.infer<typeof rowSchema>;

export type ParsedRow = { line: number; ok: true; row: ImportRow } | { line: number; ok: false; reason: string };

export function parseRow(line: number, record: Partial<Record<ImportKey, unknown>>): ParsedRow {
  const r = rowSchema.safeParse(record);
  if (r.success) return { line, ok: true, row: r.data };
  const reason = r.error.issues.map((i) => i.message).join("; ");
  return { line, ok: false, reason: reason.charAt(0).toUpperCase() + reason.slice(1) };
}

/** Linha da planilha → colunas da tabela properties. */
export function toPropertyInsert(row: ImportRow, agencyId: string) {
  const pin = row.latitude !== null && row.longitude !== null;
  return {
    agency_id: agencyId,
    external_ref: row.codigo,
    title: row.nome_do_anuncio,
    purpose: row.finalidade,
    type: row.tipo as "apartamento",
    street: row.rua,
    street_number: row.numero,
    complement: row.complemento,
    neighborhood: row.bairro,
    postal_code: row.cep,
    price: row.valor,
    condo_fee: row.condominio,
    iptu_monthly: row.iptu_mensal,
    area_m2: row.area_m2,
    bedrooms: row.quartos,
    suites: row.suites,
    bathrooms: row.banheiros,
    parking_spots: row.vagas,
    pets: row.aceita_pets,
    furnished: row.mobiliado,
    floor: row.andar,
    view: row.vista,
    amenities: row.itens_do_predio,
    description: row.descricao,
    tour_url: row.link_tour,
    lat: row.latitude,
    lng: row.longitude,
    pin_confirmed: pin,
  };
}

export function wouldGetSeal(row: ImportRow, rules: SealRules): boolean {
  return (
    missingSealItems(
      sealChecklist(
        {
          photoCount: row.fotos.length,
          area_m2: row.area_m2,
          price: row.valor,
          condo_fee: row.condominio,
          iptu_monthly: row.iptu_mensal,
          description: row.descricao,
          pin_confirmed: row.latitude !== null && row.longitude !== null,
        },
        rules,
      ),
    ) === 0
  );
}
