import Link from "next/link";
import { Icon, ScoreRing } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { shortBRL } from "@/lib/profile";

export type CardProperty = {
  id: string;
  title: string;
  neighborhood: string | null;
  bedrooms: number | null;
  area_m2: number | null;
  price: number | null;
  purpose: "venda" | "aluguel";
  photoUrl: string | null;
  available: boolean;
};

export type CardReason = { band: string; text: string };

/**
 * Cartão de recomendação na conversa: foto, nota em anel e 2 ou 3 motivos (nunca nota sem motivo).
 * Do 4º em diante fica compacto (foto pequena, nota e o motivo principal) para a lista não pesar no celular.
 */
export function RecommendationCard({
  property,
  score,
  reasons,
  compact = false,
  rank,
}: {
  property: CardProperty;
  score: number;
  reasons: CardReason[];
  compact?: boolean;
  /** Posição no ranking (1 = mais compatível). */
  rank?: number;
}) {
  const badge = rank ? (
    <span
      aria-label={`${rank}º lugar no ranking`}
      className="num grid h-7 min-w-9 flex-none place-items-center rounded-full bg-black px-2 text-[12px] font-bold text-white"
    >
      {rank}º
    </span>
  ) : null;
  const facts = [
    property.neighborhood,
    property.bedrooms !== null ? `${property.bedrooms} ${property.bedrooms === 1 ? "quarto" : "quartos"}` : null,
    property.area_m2 !== null ? `${formatNumber(property.area_m2)} m²` : null,
    property.price !== null ? `${shortBRL(property.price)}${property.purpose === "aluguel" ? "/mês" : ""}` : null,
  ].filter(Boolean);

  if (!property.available) {
    return (
      <div className="rounded-[22px] bg-white p-4 text-[12.5px] text-muted shadow-card">
        <p className="font-semibold text-ink">{property.title}</p>
        <p>Este imóvel não está mais disponível.</p>
      </div>
    );
  }

  if (compact) {
    const main = reasons[0];
    return (
      <Link
        href={`/app/imoveis/${property.id}`}
        className="flex items-center gap-3 rounded-[18px] bg-white p-2.5 shadow-soft outline outline-1 outline-transparent transition-[outline-color] hover:outline-black"
      >
        {badge}
        {property.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={property.photoUrl} alt={property.title} className="size-16 flex-none rounded-xl object-cover" />
        ) : (
          <span className="grid size-16 flex-none place-items-center rounded-xl bg-paper-2 text-muted-2">
            <Icon name="home" size="sm" />
          </span>
        )}
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13.5px] font-bold">{property.title}</span>
          <span className="block truncate text-[11px] text-muted">{facts.join(" · ")}</span>
          {main ? (
            <span className={`mt-1 block truncate text-[11.5px] ${main.band === "ok" ? "text-ok" : main.band === "warn" ? "text-warn" : "text-bad"}`}>
              {main.text}
            </span>
          ) : null}
        </span>
        <ScoreRing score={score} size={42} />
      </Link>
    );
  }

  return (
    <Link
      href={`/app/imoveis/${property.id}`}
      className="block overflow-hidden rounded-[22px] bg-white shadow-card outline outline-1 outline-transparent transition-[outline-color] hover:outline-black"
    >
      <div className="relative h-[150px] bg-paper-2">
        {property.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={property.photoUrl} alt={property.title} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-muted-2">
            <Icon name="home" />
          </div>
        )}
        {badge ? <span className="absolute left-3 top-3">{badge}</span> : null}
        <span className="absolute right-3 top-3 grid size-[60px] place-items-center rounded-full bg-white shadow-[0_4px_12px_rgb(0_0_0/0.15)]">
          <ScoreRing score={score} size={52} />
        </span>
      </div>
      <div className="grid gap-2 p-4">
        <div>
          <p className="text-[15.5px] font-bold">{property.title}</p>
          <p className="text-[11.5px] text-muted">{facts.join(" · ")}</p>
        </div>
        <ul className="grid gap-1.5">
          {reasons.slice(0, 3).map((r) => (
            <li key={r.text} className="flex items-start gap-2 text-[12.5px] text-[#3d3d3b]">
              <Icon
                name={r.band === "ok" ? "check" : "alert"}
                size="sm"
                className={r.band === "ok" ? "text-ok" : r.band === "warn" ? "text-warn" : "text-bad"}
              />
              {r.text}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
