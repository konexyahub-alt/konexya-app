import { z } from "zod";
import { canonicalNeighborhood } from "@/lib/neighborhoods";
import { PRIORITIES, type ProfileUpdate } from "@/lib/profile";

/** Edição manual do perfil (C-05): todo campo pode ser corrigido, sempre validado no servidor. */
const neighborhood = z
  .string()
  .trim()
  .min(2, "Escreva o nome do bairro.")
  .max(60, "Nome de bairro muito longo.")
  .transform((n) => canonicalNeighborhood(n) ?? n);

export const profileUpdateSchema = z
  .object({
    priorities: z.array(z.enum(PRIORITIES)).max(PRIORITIES.length),
    work_neighborhood: neighborhood.nullable(),
    works_from_home: z.boolean().nullable(),
    commute_max_min: z.number().int().min(5).max(180).nullable(),
    lifestyle: z.enum(["tranquilidade", "meio_termo", "movimento"]).nullable(),
    has_children: z.boolean().nullable(),
    pets: z.enum(["nenhum", "pequeno", "grande"]).nullable(),
    purpose: z.enum(["comprar", "alugar"]).nullable(),
    goal: z.enum(["morar", "investir", "ambos"]).nullable(),
    timeline: z.enum(["ate_3_meses", "ate_6_meses", "pesquisando"]).nullable(),
    budget_min: z.number().min(0).max(50_000_000).nullable(),
    budget_max: z.number().min(300, "Informe um valor maior.").max(50_000_000).nullable(),
    property_kind: z.enum(["apartamento", "casa", "tanto_faz"]).nullable(),
    bedrooms_min: z.number().int().min(0).max(10).nullable(),
    parking_min: z.number().int().min(0).max(10).nullable(),
    neighborhoods: z.array(neighborhood).max(10, "Escolha até 10 bairros."),
    extras: z.array(z.string().trim().min(1).max(40)).max(8),
  })
  .partial()
  .superRefine((u, ctx) => {
    if (u.budget_min != null && u.budget_max != null && u.budget_min > u.budget_max) {
      ctx.addIssue({ code: "custom", path: ["budget_min"], message: "O valor mínimo não pode passar do máximo." });
    }
  })
  .transform((u) => {
    const out = { ...u } as ProfileUpdate;
    if (u.works_from_home) out.work_neighborhood = null;
    if (u.purpose === "alugar") out.goal = "morar";
    if (u.neighborhoods) out.neighborhoods = [...new Set(u.neighborhoods)];
    return out;
  });
