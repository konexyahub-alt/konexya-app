"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon, Wordmark, type IconName } from "@/components/ui";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  /** Nome curto na barra do celular. */
  short?: string;
  icon: IconName;
  /** Fica na barra do celular; os demais vão para "Mais". */
  primary?: boolean;
  /** Número de pendências (ex.: visitas aguardando confirmação). */
  badge?: number;
};

function Badge({ n, className }: { n?: number; className?: string }) {
  if (!n) return null;
  return (
    <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold", className)} aria-label={`${n} pendente${n > 1 ? "s" : ""}`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

/**
 * Estrutura do painel: menu lateral no computador, barra inferior no celular (os itens principais e "Mais").
 * Só aparecem os itens que já funcionam (os demais entram nas próximas etapas).
 */
export function PanelShell({
  agencyName,
  roleLabel,
  items,
  signOut,
  children,
}: {
  agencyName: string;
  roleLabel: string;
  items: NavItem[];
  signOut: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const primary = items.filter((i) => i.primary);
  const rest = items.filter((i) => !i.primary);
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const initials = agencyName
    .replace(/\b(ltda|me|eireli|s\/?a)\b\.?/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col gap-1 border-r border-paper-2 bg-white px-3.5 py-5 lg:flex">
        <div className="flex items-center gap-2.5 px-2 pb-4">
          <span className="grid size-9 flex-none place-items-center rounded-full bg-black text-xs font-bold text-white">
            {initials}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-bold">{agencyName}</p>
            <p className="text-xs text-muted">{roleLabel}</p>
          </div>
        </div>
        <nav aria-label="Painel" className="grid gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={cn(
                "flex min-h-[42px] items-center gap-2.5 rounded-xl px-2.5 text-[13.5px] font-semibold",
                active(item.href) ? "bg-paper text-black" : "text-muted hover:bg-paper",
              )}
            >
              <Icon name={item.icon} />
              <span className="flex-1">{item.label}</span>
              <Badge n={item.badge} className="bg-black text-white" />
            </Link>
          ))}
        </nav>
        <div className="mt-auto grid gap-3 px-2">
          <form action={signOut}>
            <button type="submit" className="min-h-touch text-[13px] font-semibold text-muted underline underline-offset-4">
              Sair
            </button>
          </form>
          <Wordmark className="h-4" />
        </div>
      </aside>
      <div className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</div>
      <nav
        aria-label="Painel"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-white pb-[max(12px,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      >
        {primary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active(item.href) ? "page" : undefined}
            className={cn(
              "relative grid min-h-touch min-w-16 justify-items-center gap-0.5 text-[10.5px] font-semibold",
              active(item.href) ? "text-black" : "text-muted-2",
            )}
          >
            <Icon name={item.icon} />
            {item.short ?? item.label.split(" ")[0]}
            <Badge n={item.badge} className="absolute -top-1 left-1/2 ml-1.5 h-4 min-w-4 bg-black px-1 text-[10px] text-white" />
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMore(true)}
          aria-expanded={more}
          className={cn(
            "grid min-h-touch min-w-16 justify-items-center gap-0.5 text-[10.5px] font-semibold",
            rest.some((i) => active(i.href)) ? "text-black" : "text-muted-2",
          )}
        >
          <Icon name="menu" />
          Mais
        </button>
      </nav>
      {more ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 lg:hidden" role="presentation" onClick={() => setMore(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções"
            className="grid w-full gap-1 rounded-t-[28px] bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden className="mx-auto mb-2 block h-[5px] w-10 rounded-full bg-line-2" />
            {rest.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMore(false)}
                aria-current={active(item.href) ? "page" : undefined}
                className={cn("flex min-h-12 items-center gap-3 rounded-xl px-3 text-[14px] font-semibold", active(item.href) && "bg-paper")}
              >
                <Icon name={item.icon} />
                <span className="flex-1">{item.label}</span>
                <Badge n={item.badge} className="bg-black text-white" />
              </Link>
            ))}
            <form action={signOut}>
              <button type="submit" className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-[14px] font-semibold text-muted">
                <Icon name="arrow" />
                Sair
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
