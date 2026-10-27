import { z } from "zod";

/** Remove tudo que não é dígito. */
export const onlyDigits = (value: string) => value.replace(/\D/g, "");

/** CNPJ com dígitos verificadores válidos (aceita com ou sem máscara). */
export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digit = (base: string) => {
    let factor = base.length - 7;
    let sum = 0;
    for (const char of base) {
      sum += Number(char) * factor--;
      if (factor < 2) factor = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const first = digit(cnpj.slice(0, 12));
  const second = digit(cnpj.slice(0, 12) + first);
  return cnpj.endsWith(`${first}${second}`);
}

export function formatCnpj(value: string): string {
  return onlyDigits(value)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** Celular/telefone brasileiro com DDD: 10 ou 11 dígitos (sem o 55). */
export function normalizePhone(value: string): string | null {
  let digits = onlyDigits(value);
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  return digits.length === 10 || digits.length === 11 ? digits : null;
}

export const EMAIL_HINT =
  "Esse e-mail não parece completo. Confira se tem @ e o domínio, como voce@email.com";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/, EMAIL_HINT);

export const otpSchema = z.string().trim().regex(/^\d{6}$/, "O código tem 6 números.");

export const personNameSchema = z
  .string()
  .trim()
  .min(1, "Escreva seu nome.")
  .max(80, "Use até 80 caracteres.");

export const partnerSchema = z.object({
  legalName: z.string().trim().min(2, "Informe a razão social.").max(160),
  cnpj: z
    .string()
    .transform(onlyDigits)
    .refine(isValidCnpj, "CNPJ inválido. Confira os números."),
  creci: z.string().trim().min(2, "Informe o CRECI jurídico.").max(30),
  managerName: z.string().trim().min(2, "Informe o nome do gestor.").max(120),
  whatsapp: z
    .string()
    .transform((v) => normalizePhone(v) ?? "")
    .refine((v) => v.length > 0, "Informe o WhatsApp com DDD, como (85) 90000-0000."),
});
