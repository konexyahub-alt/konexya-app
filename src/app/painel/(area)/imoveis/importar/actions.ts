"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { requireDraftingMember } from "@/lib/auth";
import { mapHeaders, parseRow, toPropertyInsert, wouldGetSeal, type ImportKey } from "@/lib/import";
import { DEFAULT_SEAL_RULES } from "@/lib/property";
import { createClient } from "@/lib/supabase/server";

type RawRecord = Partial<Record<ImportKey, string>>;
export type Preview = {
  ok: boolean;
  error?: string;
  fileName?: string;
  total?: number;
  valid?: { line: number; record: RawRecord; name: string; update: boolean }[];
  errors?: { line: number; reason: string }[];
  sealCount?: number;
};

const MAX_ROWS = 1000;
const MAX_BYTES = 4 * 1024 * 1024;

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("hyperlink" in value && typeof value.hyperlink === "string") return value.hyperlink;
    if ("result" in value) return String(value.result ?? "");
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if (value instanceof Date) return value.toISOString();
  }
  return String(value);
}

async function readRows(file: File): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  const buf = Buffer.from(await file.arrayBuffer());
  if (/\.csv$/i.test(file.name)) {
    const text = buf.toString("utf8").replace(/^﻿/, "");
    const sep = (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
    return text
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map((line) => {
        const out: string[] = [];
        let cur = "";
        let quoted = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (quoted && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else quoted = !quoted;
          } else if (ch === sep && !quoted) {
            out.push(cur);
            cur = "";
          } else cur += ch;
        }
        out.push(cur);
        return out;
      });
  }
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const sheet = wb.worksheets[0];
  const rows: string[][] = [];
  sheet?.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    for (let c = 1; c <= row.cellCount; c++) values.push(cellText(row.getCell(c).value).trim());
    rows.push(values);
  });
  return rows;
}

export async function previewImport(form: FormData): Promise<Preview> {
  const { membership } = await requireDraftingMember("/painel/imoveis/importar");
  const file = form.get("arquivo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Escolha a planilha preenchida." };
  if (file.size > MAX_BYTES) return { ok: false, error: "A planilha passa de 4 MB. Divida em arquivos menores." };
  if (!/\.(xlsx|csv)$/i.test(file.name)) return { ok: false, error: "Envie um arquivo .xlsx (Excel) ou .csv." };

  let rows: string[][];
  try {
    rows = await readRows(file);
  } catch {
    return { ok: false, error: "Não conseguimos ler o arquivo. Salve como .xlsx e envie de novo." };
  }
  if (rows.length < 2) return { ok: false, error: "A planilha está vazia. Preencha a partir da segunda linha." };
  const keys = mapHeaders(rows[0]);
  if (!keys.includes("nome_do_anuncio") || !keys.includes("valor")) {
    return { ok: false, error: "Não reconhecemos as colunas. Use a planilha modelo da Konexya." };
  }
  const body = rows.slice(1);
  if (body.length > MAX_ROWS) return { ok: false, error: `No máximo ${MAX_ROWS} imóveis por arquivo.` };

  const supabase = await createClient();
  const { data: rules } = await supabase.from("seal_rules").select("min_photos, min_description_chars").maybeSingle();
  const sealRules = rules ? { minPhotos: rules.min_photos, minDescriptionChars: rules.min_description_chars } : DEFAULT_SEAL_RULES;
  const { data: existing } = await supabase
    .from("properties")
    .select("external_ref")
    .eq("agency_id", membership.agencyId)
    .not("external_ref", "is", null);
  const existingRefs = new Set((existing ?? []).map((e) => e.external_ref));

  const valid: NonNullable<Preview["valid"]> = [];
  const errors: NonNullable<Preview["errors"]> = [];
  const seenRefs = new Set<string>();
  let sealCount = 0;
  body.forEach((cells, i) => {
    const line = i + 2;
    if (cells.every((c) => !c)) return;
    const record: RawRecord = {};
    keys.forEach((k, ci) => {
      if (k) record[k] = cells[ci] ?? "";
    });
    const parsed = parseRow(line, record);
    if (!parsed.ok) {
      errors.push({ line, reason: parsed.reason });
      return;
    }
    const ref = parsed.row.codigo;
    if (ref && seenRefs.has(ref)) {
      errors.push({ line, reason: `Código ${ref} repetido na planilha` });
      return;
    }
    if (ref) seenRefs.add(ref);
    if (wouldGetSeal(parsed.row, sealRules)) sealCount++;
    valid.push({ line, record, name: parsed.row.nome_do_anuncio, update: Boolean(ref && existingRefs.has(ref)) });
  });
  return { ok: true, fileName: file.name, total: valid.length + errors.length, valid, errors, sealCount };
}

export type CommitResult = { ok: boolean; created: number; updated: number; failed: { line: number; reason: string }[]; error?: string };

export async function commitImport(records: { line: number; record: RawRecord }[], publishRequested: boolean): Promise<CommitResult> {
  const { membership, canPublish } = await requireDraftingMember("/painel/imoveis/importar");
  // Cadastro ainda pendente: tudo entra como rascunho.
  const publish = publishRequested && canPublish;
  if (records.length > MAX_ROWS) return { ok: false, created: 0, updated: 0, failed: [], error: "Arquivo grande demais." };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("properties")
    .select("id, external_ref")
    .eq("agency_id", membership.agencyId)
    .not("external_ref", "is", null);
  const idByRef = new Map((existing ?? []).map((e) => [e.external_ref!, e.id]));

  let created = 0;
  let updated = 0;
  const failed: CommitResult["failed"] = [];
  for (const { line, record } of records) {
    const parsed = parseRow(line, record);
    if (!parsed.ok) {
      failed.push({ line, reason: parsed.reason });
      continue;
    }
    const { agency_id, ...fields } = toPropertyInsert(parsed.row, membership.agencyId);
    const existingId = parsed.row.codigo ? idByRef.get(parsed.row.codigo) : undefined;
    let id = existingId;
    if (existingId) {
      const { error } = await supabase.from("properties").update(fields).eq("id", existingId);
      if (error) {
        failed.push({ line, reason: "Não conseguimos atualizar este imóvel" });
        continue;
      }
      await supabase.from("property_photos").delete().eq("property_id", existingId).not("source_url", "is", null);
      updated++;
    } else {
      const { data, error } = await supabase.from("properties").insert({ agency_id, ...fields }).select("id").single();
      if (error || !data) {
        failed.push({ line, reason: "Não conseguimos cadastrar este imóvel" });
        continue;
      }
      id = data.id;
      created++;
    }
    if (parsed.row.fotos.length && id) {
      const { data: kept } = await supabase.from("property_photos").select("id").eq("property_id", id).limit(1);
      const hasCover = Boolean(kept?.length);
      await supabase.from("property_photos").insert(
        parsed.row.fotos.map((url, i) => ({
          property_id: id!,
          source_url: url,
          position: i + 100,
          is_cover: !hasCover && i === 0,
        })),
      );
    }
    if (publish && id) await supabase.from("properties").update({ status: "publicado" }).eq("id", id).eq("status", "rascunho");
  }
  revalidatePath("/painel/imoveis");
  return { ok: true, created, updated, failed };
}
