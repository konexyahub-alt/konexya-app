import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

/** Campo de texto com rótulo, dica e mensagem de erro. Fonte de 16 px evita zoom no celular. */
export function TextField({ label, hint, error, className, id, ...rest }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-erro` : hint ? `${inputId}-dica` : undefined;
  return (
    <div className={cn("grid min-w-0 gap-1.5 text-[12.5px] font-semibold", className)}>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "min-h-touch rounded-field border-[1.5px] bg-white p-3.5 text-base font-medium focus:outline-none",
          error ? "border-bad" : "border-line-2 focus:border-black",
        )}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-erro`} className="font-semibold text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-dica`} className="font-medium text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
