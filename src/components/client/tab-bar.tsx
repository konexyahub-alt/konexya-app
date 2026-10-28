import Link from "next/link";
import { Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Abas do app do cliente. Mapa e Salvos entram na etapa 3; até lá só aparecem as abas que funcionam.
 */
const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/app", label: "Conversa", icon: "chat" },
  { href: "/app/corretor", label: "Corretor", icon: "broker" },
  { href: "/app/perfil", label: "Perfil", icon: "user" },
];

export function TabBar({ active }: { active: "Conversa" | "Corretor" | "Perfil" }) {
  const isActive = (href: string) => TABS.find((t) => t.href === href)?.label === active;
  return (
    <nav
      aria-label="App"
      className="sticky bottom-0 z-30 mt-auto flex justify-around border-t border-paper-2 bg-white pb-[max(10px,env(safe-area-inset-bottom))] pt-2"
    >
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "grid min-h-touch min-w-20 justify-items-center gap-0.5 text-[10.5px] font-semibold",
              active ? "text-black" : "text-[#a1a19d]",
            )}
          >
            <Icon name={tab.icon} />
            {tab.label}
            <span aria-hidden className={cn("h-[3px] w-[18px] rounded-full", active ? "bg-black" : "bg-transparent")} />
          </Link>
        );
      })}
    </nav>
  );
}
