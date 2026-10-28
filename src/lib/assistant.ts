import { z } from "zod";

/**
 * Assistente virtual da imobiliária (docs/DECISOES.md). Faz o primeiro atendimento: boas-vindas, as
 * perguntas configuradas (até 8) e a despedida, sempre com o selo "assistente virtual". Não agenda, não
 * negocia, não promete. Para quando o corretor envia a primeira mensagem.
 */
export const MAX_ENABLED_QUESTIONS = 8;
export const WARN_ENABLED_QUESTIONS = 5;

export const CLIENT_NAME_TAG = "[nome do cliente]";
export const ASSISTANT_NAME_TAG = "[nome da assistente]";

/** Perguntas padrão: as respostas vão para a Qualificação do lead. */
export const STANDARD_QUESTIONS = {
  pagamento: {
    label: "Pagamento",
    options: ["Financiamento", "Financiamento com FGTS", "À vista", "Consórcio", "Ainda não sei"],
  },
  credito: { label: "Crédito aprovado", options: ["Sim, já aprovado", "Em análise", "Ainda não"] },
  fgts: { label: "FGTS", options: ["Sim", "Não", "Não sei"] },
  vender_imovel: { label: "Vender outro imóvel", options: ["Sim", "Não"] },
  horario: { label: "Melhor horário", options: ["Manhã", "Tarde", "Noite"] },
} as const;
export type StandardQuestionId = keyof typeof STANDARD_QUESTIONS;

export function isStandardQuestion(id: string): id is StandardQuestionId {
  return id in STANDARD_QUESTIONS;
}

export const questionSchema = z.object({
  id: z.string().regex(/^(pagamento|credito|fgts|vender_imovel|horario|c_[a-z0-9]{6,36})$/),
  kind: z.enum(["padrao", "propria"]),
  text: z
    .string()
    .trim()
    .min(5, "Escreva a pergunta com pelo menos 5 caracteres.")
    .max(200, "A pergunta pode ter até 200 caracteres."),
  enabled: z.boolean(),
});
export type AssistantQuestion = z.infer<typeof questionSchema>;

export const assistantSettingsSchema = z
  .object({
    enabled: z.boolean(),
    name: z.string().trim().min(2, "O nome precisa ter pelo menos 2 letras.").max(30, "Use até 30 caracteres."),
    welcome_message: z
      .string()
      .trim()
      .min(10, "A mensagem de boas-vindas está curta demais.")
      .max(600, "A mensagem pode ter até 600 caracteres."),
    farewell_message: z
      .string()
      .trim()
      .min(10, "A despedida está curta demais.")
      .max(600, "A mensagem pode ter até 600 caracteres."),
    questions: z.array(questionSchema).max(13),
    distribution: z.enum(["rodizio", "manual"]),
  })
  .superRefine((s, ctx) => {
    const enabled = s.questions.filter((q) => q.enabled).length;
    if (enabled > MAX_ENABLED_QUESTIONS) {
      ctx.addIssue({ code: "custom", path: ["questions"], message: `Ligue no máximo ${MAX_ENABLED_QUESTIONS} perguntas.` });
    }
    const ids = new Set(s.questions.map((q) => q.id));
    if (ids.size !== s.questions.length) ctx.addIssue({ code: "custom", path: ["questions"], message: "Pergunta repetida." });
    for (const q of s.questions) {
      if ((q.kind === "padrao") !== isStandardQuestion(q.id)) {
        ctx.addIssue({ code: "custom", path: ["questions"], message: "Pergunta inválida." });
      }
    }
  });
export type AssistantSettings = z.infer<typeof assistantSettingsSchema>;

/** Troca as etiquetas pelo nome do cliente e da assistente. O resto sai exatamente como foi escrito. */
export function renderMessage(template: string, vars: { clientName: string; assistantName: string }): string {
  return template
    .split(CLIENT_NAME_TAG)
    .join(firstName(vars.clientName))
    .split(ASSISTANT_NAME_TAG)
    .join(vars.assistantName)
    .trim();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function parseQuestions(raw: unknown): AssistantQuestion[] {
  const parsed = z.array(questionSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

/** Respostas rápidas de uma pergunta (só as padrão têm opções fixas). */
export function questionOptions(id: string): string[] {
  return isStandardQuestion(id) ? [...STANDARD_QUESTIONS[id].options] : [];
}

/** Resposta tocada num botão de uma pergunta padrão, se for uma das opções. */
export function matchOption(id: string, text: string): string | null {
  const t = text.trim().toLowerCase();
  return questionOptions(id).find((o) => o.toLowerCase() === t) ?? null;
}

export type Qualification = Partial<Record<StandardQuestionId, { value: string; at: string }>>;
export type CustomAnswer = { question: string; answer: string; at: string };

/** Próxima pergunta da fila que ainda existe e está ligada na configuração atual. */
export function nextQueuedQuestion(queue: string[], questions: AssistantQuestion[]) {
  for (let i = 0; i < queue.length; i++) {
    const q = questions.find((x) => x.id === queue[i] && x.enabled);
    if (q) return { question: q, rest: queue.slice(i + 1) };
  }
  return null;
}
