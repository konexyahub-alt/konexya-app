import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "inverse";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Um único botão "primary" por tela. */
  variant?: Variant;
  size?: "md" | "sm";
  fullWidth?: boolean;
  loading?: boolean;
};

const variants: Record<Variant, string> = {
  primary: "border-black bg-black text-white hover:bg-[#2b2b2d]",
  secondary: "border-black bg-white text-black hover:bg-paper",
  inverse: "border-white bg-white text-black hover:bg-[#e6e6e3]",
};

/**
 * Botão principal: preto, texto branco, cantos totalmente arredondados, altura mínima de 44 px.
 * Botão secundário: contorno preto, fundo branco.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: Pick<ButtonProps, "variant" | "size" | "fullWidth"> = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-40",
    // O tamanho "sm" mantém a área de toque de 44 px; só o visual fica mais compacto.
    size === "md" ? "min-h-touch px-[18px] text-sm" : "min-h-touch px-3.5 text-[13px] sm:min-h-9",
    variants[variant],
    fullWidth && "w-full",
  );
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClasses({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string };

/** Botão redondo só com ícone. Sempre com rótulo acessível. */
export function IconButton({ label, className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-touch place-items-center rounded-full border border-line bg-white hover:bg-paper",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...rest}
    />
  );
}
