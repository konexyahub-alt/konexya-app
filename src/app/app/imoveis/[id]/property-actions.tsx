"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Icon, IconButton, useToast } from "@/components/ui";
import { shareProfile, toggleFavorite } from "../../actions";

/** Coração da ficha: salva ou tira dos salvos. */
export function FavoriteButton({ propertyId, saved }: { propertyId: string; saved: boolean }) {
  const [on, setOn] = useState(saved);
  const [pending, start] = useTransition();
  const { showToast } = useToast();
  return (
    <IconButton
      label={on ? "Tirar dos salvos" : "Salvar"}
      aria-pressed={on}
      disabled={pending}
      className="border-0 bg-[#f4f4f2]"
      onClick={() =>
        start(async () => {
          const next = !on;
          setOn(next);
          const r = await toggleFavorite(propertyId, next);
          if (r.error) {
            setOn(!next);
            showToast(r.error);
          } else showToast(next ? "Salvo." : "Tirado dos salvos.");
        })
      }
    >
      <Icon name={on ? "heartF" : "heart"} />
    </IconButton>
  );
}

/**
 * Barra fixa da ficha com "Falar com o corretor" e a folha de consentimento (C-10).
 * Sem "Autorizar", nada é enviado (regra 1). Se já compartilhou com esta imobiliária, vira "Continuar conversa".
 */
export function ContactBar({
  propertyId,
  propertyTitle,
  agencyName,
  conversationId,
}: {
  propertyId: string;
  propertyTitle: string;
  agencyName: string;
  conversationId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <div className="sticky bottom-0 z-30 mt-auto bg-white px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 shadow-bar">
        {conversationId ? (
          <Link
            href={`/app/corretor/${conversationId}`}
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-black text-[15px] font-semibold text-white"
          >
            Continuar conversa
          </Link>
        ) : (
          <Button fullWidth className="min-h-12 text-[15px]" onClick={() => setOpen(true)}>
            Falar com o corretor
          </Button>
        )}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55" role="presentation" onClick={() => !pending && setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="consentimento-titulo"
            className="w-full max-w-[430px] animate-toast-in rounded-t-[28px] bg-white px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden className="mx-auto mb-5 block h-[5px] w-10 rounded-full bg-line-2" />
            <div className="flex items-center gap-2.5">
              <span className="grid size-[42px] place-items-center rounded-full bg-black text-white">
                <Icon name="shield" />
              </span>
              <span className="trk">Sua privacidade</span>
            </div>
            <h2 id="consentimento-titulo" className="mt-3.5 text-2xl font-light leading-tight tracking-tight">
              Compartilhar seu perfil com a <b className="font-bold">{agencyName}</b>?
            </h2>
            <ul className="mt-4 grid gap-3 text-[12.5px] text-[#3d3d3b]">
              {[
                "Seu perfil: orçamento, rotina, pets e prioridades, com um resumo feito pela IA",
                `Os imóveis desta imobiliária que você viu e salvou, incluindo o ${propertyTitle}`,
                "O bairro onde você trabalha. Endereços exatos nunca vão.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Icon name="check" size="sm" className="mt-px text-ok" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11.5px] text-muted">
              A assistente virtual da imobiliária pode te fazer algumas perguntas rápidas até o corretor chegar.
            </p>
            <p className="mt-2 text-[11.5px] text-muted">
              Vale só para esta imobiliária. Você pode revogar quando quiser no seu Perfil.{" "}
              <Link href="/privacidade" target="_blank" className="underline underline-offset-2">
                Política de Privacidade
              </Link>
            </p>
            {error ? (
              <p role="alert" className="mt-3 text-[12.5px] font-semibold text-bad">
                {error}
              </p>
            ) : null}
            <Button
              fullWidth
              className="mt-4 min-h-[52px] text-[15px]"
              loading={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const r = await shareProfile(propertyId);
                  if (r?.error) setError(r.error);
                })
              }
            >
              Autorizar e falar com o corretor
            </Button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setOpen(false)}
              className="mt-1 min-h-touch w-full text-sm font-semibold underline underline-offset-4"
            >
              Agora não
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
