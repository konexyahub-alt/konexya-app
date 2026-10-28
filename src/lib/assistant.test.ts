import { describe, expect, it } from "vitest";
import {
  MAX_ENABLED_QUESTIONS,
  assistantSettingsSchema,
  matchOption,
  nextQueuedQuestion,
  renderMessage,
  type AssistantQuestion,
} from "./assistant";

const standard: AssistantQuestion[] = [
  { id: "pagamento", kind: "padrao", text: "Como você pretende pagar?", enabled: true },
  { id: "credito", kind: "padrao", text: "Já tem crédito aprovado?", enabled: false },
  { id: "horario", kind: "padrao", text: "Melhor horário?", enabled: true },
];

const valid = {
  enabled: true,
  name: "Lia",
  welcome_message: "Oi, [nome do cliente]! Sou a [nome da assistente].",
  farewell_message: "Obrigada, [nome do cliente]!",
  questions: standard,
  distribution: "rodizio" as const,
};

describe("assistente virtual da imobiliária", () => {
  it("envia o texto exatamente como a imobiliária escreveu, com os nomes encaixados", () => {
    expect(renderMessage(valid.welcome_message, { clientName: "Ana Lima", assistantName: "Lia" })).toBe(
      "Oi, Ana! Sou a Lia.",
    );
  });

  it("aceita no máximo 8 perguntas ligadas", () => {
    const custom = Array.from({ length: 9 }, (_, i) => ({
      id: `c_${String(i).padStart(6, "0")}`,
      kind: "propria" as const,
      text: `Pergunta própria ${i}?`,
      enabled: true,
    }));
    expect(assistantSettingsSchema.safeParse({ ...valid, questions: custom }).success).toBe(false);
    expect(assistantSettingsSchema.safeParse({ ...valid, questions: custom.slice(0, MAX_ENABLED_QUESTIONS) }).success).toBe(true);
  });

  it("não aceita pergunta própria disfarçada de padrão nem repetida", () => {
    const fake = { ...valid, questions: [{ id: "pagamento", kind: "propria", text: "Outra coisa?", enabled: true }] };
    expect(assistantSettingsSchema.safeParse(fake).success).toBe(false);
    const dup = { ...valid, questions: [standard[0], standard[0]] };
    expect(assistantSettingsSchema.safeParse(dup).success).toBe(false);
  });

  it("segue a fila pulando o que foi desligado depois", () => {
    expect(nextQueuedQuestion(["credito", "horario"], standard)).toEqual({ question: standard[2], rest: [] });
    expect(nextQueuedQuestion(["credito"], standard)).toBeNull();
  });

  it("reconhece a resposta tocada num botão", () => {
    expect(matchOption("pagamento", "financiamento com fgts")).toBe("Financiamento com FGTS");
    expect(matchOption("pagamento", "vou pensar")).toBeNull();
  });
});
