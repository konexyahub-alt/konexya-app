"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, Wordmark, type IconName } from "@/components/ui";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: IconName };

/**
 * Estrutura do painel: menu lateral no computador, barra inferior no celular.
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
      <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col gap-1 border-r border-line px-3.5 py-5 lg:flex">
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
              {item.label}
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
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active(item.href) ? "page" : undefined}
            className={cn(
              "grid min-h-touch min-w-16 justify-items-center gap-0.5 text-[10.5px] font-semibold",
              active(item.href) ? "text-black" : "text-muted-2",
            )}
          >
            <Icon name={item.icon} />
            {item.label.split(" ")[0]}
          </Link>
        ))}
        <form action={signOut} className="contents">
          <button type="submit" className="grid min-h-touch min-w-16 justify-items-center gap-0.5 text-[10.5px] font-semibold text-muted-2">
            <Icon name="arrow" />
            Sair
          </button>
        </form>
      </nav>
    </div>
  );
}
