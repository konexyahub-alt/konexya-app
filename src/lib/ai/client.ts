import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { serverEnv } from "@/lib/env";

/**
 * Chamada à IA da Anthropic, sempre no servidor e sempre com saída estruturada validada por Zod
 * antes de qualquer gravação. Recusa do modelo, saída inválida ou erro de rede viram AiError, e a tela
 * mostra "Não consegui responder agora. Tente de novo." (nunca o erro técnico).
 */
export class AiError extends Error {
  constructor(
    readonly reason: "indisponivel" | "recusa" | "invalido" | "erro",
    message: string,
  ) {
    super(message);
  }
}

export type AiResult<T> = {
  data: T;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

let client: Anthropic | null = null;

export function isAiConfigured(): boolean {
  return !!serverEnv().ANTHROPIC_API_KEY;
}

function getClient(): Anthropic {
  const key = serverEnv().ANTHROPIC_API_KEY;
  if (!key) throw new AiError("indisponivel", "ANTHROPIC_API_KEY não configurada");
  client ??= new Anthropic({ apiKey: key, maxRetries: 1, timeout: 45_000 });
  return client;
}

export async function generateStructured<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<AiResult<z.infer<S>>> {
  const anthropic = getClient();
  const model = serverEnv().ANTHROPIC_MODEL;
  let response;
  try {
    response = await anthropic.beta.messages.parse({
      model,
      max_tokens: opts.maxTokens ?? 4000,
      system: opts.system,
      messages: opts.messages,
      output_config: { format: betaZodOutputFormat(opts.schema), effort: opts.effort ?? "low" },
      // Se o modelo recusar por política, a própria API tenta de novo num modelo alternativo.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) throw new AiError("erro", `API ${error.status}: ${error.message}`);
    throw new AiError("invalido", error instanceof Error ? error.message : "saída inválida");
  }
  if (response.stop_reason === "refusal") throw new AiError("recusa", "o modelo recusou");
  if (response.stop_reason === "max_tokens") throw new AiError("invalido", "resposta cortada");
  const parsed = opts.schema.safeParse(response.parsed_output);
  if (!parsed.success) throw new AiError("invalido", "saída fora do formato");
  return {
    data: parsed.data,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
