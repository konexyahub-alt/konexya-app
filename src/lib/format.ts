const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** R$ 685.000 (sem centavos; anúncios não usam centavos). */
export function formatBRL(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  return brl.format(Number(value)).replace(/ /g, " ");
}

export function formatNumber(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  return num.format(Number(value));
}

/** "3 quartos", "1 quarto". */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
