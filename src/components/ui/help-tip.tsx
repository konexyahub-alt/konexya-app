"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

const MARGIN = 12;
const WIDTH = 264;

/**
 * Ajuda "?" ao lado de um termo que pode gerar dúvida. No celular abre ao tocar; no computador, também ao passar o
 * mouse. Fecha ao tocar fora, com Esc ou tocando de novo. Use pouco: se tudo precisa de ajuda, o texto da tela
 * é que está confuso.
 */
export function HelpTip({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const width = Math.min(WIDTH, window.innerWidth - MARGIN * 2);
    const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, MARGIN), window.innerWidth - width - MARGIN);
    const height = box.current?.offsetHeight ?? 0;
    const below = r.bottom + 8;
    const top = below + height > window.innerHeight - MARGIN && r.top - height - 8 > MARGIN ? r.top - height - 8 : below;
    setPos({ top, left, width });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e.type === "pointerdown" && (btn.current?.contains(e.target as Node) || box.current?.contains(e.target as Node))) return;
      setOpen(false);
      setPinned(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <span className={cn("relative inline-flex align-middle", className)}>
      <button
        ref={btn}
        type="button"
        aria-label={`O que é: ${label}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => {
          setPinned(!pinned);
          setOpen(!pinned);
        }}
        onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && !pinned && setOpen(false)}
        // Alvo de toque de 44 px sem empurrar o texto ao lado.
        className="-m-3 grid size-11 place-items-center rounded-full text-muted-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-black"
      >
        <Icon name="help" size="sm" />
      </button>
      {open ? (
        <div
          ref={box}
          id={id}
          role="tooltip"
          style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? 0, width: pos?.width ?? WIDTH }}
          className="z-50 rounded-[14px] bg-black px-3.5 py-3 text-left text-[12.5px] font-normal normal-case leading-relaxed tracking-normal text-white shadow-[0_8px_24px_rgb(0_0_0/0.2)]"
        >
          {children}
        </div>
      ) : null}
    </span>
  );
}
