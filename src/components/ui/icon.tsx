import { cn } from "@/lib/cn";
import { ICONS, type IconName } from "./brand-assets";

type IconProps = {
  name: IconName;
  size?: "sm" | "md";
  className?: string;
  /** Sem rótulo o ícone é decorativo (aria-hidden). */
  label?: string;
};

/** Ícone de linha simples: traço fino, cantos arredondados. */
export function Icon({ name, size = "md", className, label }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "flex-none fill-none stroke-current",
        size === "sm" ? "size-4" : "size-5",
        className,
      )}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      // Os caminhos são constantes do próprio código (brand-assets.ts), nunca entrada do usuário.
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

export type { IconName };
