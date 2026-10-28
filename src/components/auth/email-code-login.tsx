"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Icon, IconButton, TextField } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { RETURNING_COOKIE, RETURNING_MAX_AGE } from "@/lib/returning";
import { emailSchema, otpSchema } from "@/lib/validation";

const RESEND_SECONDS = 60;

type Props = {
  /** Para onde ir depois do código confirmado. */
  next: string;
  title: string;
  subtitle: string;
  /** Link de voltar na primeira etapa (ex.: boas-vindas). */
  backHref?: string;
  googleEnabled?: boolean;
  /** Pré-preenche e trava o e-mail (convite). */
  fixedEmail?: string;
  footer?: React.ReactNode;
};

/** Login sem senha: e-mail → código de 6 dígitos. Usado pelo app do cliente e pelo painel. */
export function EmailCodeLogin({ next, title, subtitle, backHref, googleEnabled, fixedEmail, footer }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(fixedEmail ?? "");
  const [emailError, setEmailError] = useState<string>();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const emailValid = emailSchema.safeParse(email).success;

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setEmailError(undefined);
    const { error } = await createClient().auth.signInWithOtp({
      email: parsed.data,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setEmailError(friendlyAuthError(error.code, error.status));
      return;
    }
    setEmail(parsed.data);
    setCode("");
    setCodeError(undefined);
    setStep("code");
    setSecondsLeft(RESEND_SECONDS);
  }

  async function verify(value: string) {
    if (!otpSchema.safeParse(value).success) return;
    setBusy(true);
    setCodeError(undefined);
    const { error } = await createClient().auth.verifyOtp({ email, token: value, type: "email" });
    if (error) {
      setBusy(false);
      setCodeError(friendlyAuthError(error.code, error.status));
      return;
    }
    setConfirmed(true);
    document.cookie = `${RETURNING_COOKIE}=1; Path=/; Max-Age=${RETURNING_MAX_AGE}; SameSite=Lax; Secure`;
    router.replace(next);
    router.refresh();
  }

  async function google() {
    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setBusy(false);
      setEmailError("Não conseguimos abrir o login do Google. Tente de novo.");
    }
  }

  if (step === "code") {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <IconButton label="Voltar" onClick={() => setStep("email")} className="border-0 bg-paper">
          <Icon name="back" />
        </IconButton>
        <h1 className="mt-2 text-[26px] font-bold tracking-tight">Digite o código</h1>
        <p className="text-[13px] text-muted">
          Enviado para <b className="text-ink">{email}</b>
        </p>
        <CodeInput
          value={code}
          invalid={Boolean(codeError)}
          disabled={busy || confirmed}
          onChange={(v) => {
            setCode(v);
            setCodeError(undefined);
            if (v.length === 6) void verify(v);
          }}
        />
        {confirmed ? (
          <p role="status" className="flex items-center gap-1.5 text-[13px] font-semibold text-ok">
            <Icon name="check" size="sm" /> Código confirmado
          </p>
        ) : codeError ? (
          <p role="alert" className="text-[13px] font-semibold text-bad">
            {codeError}
          </p>
        ) : null}
        {secondsLeft > 0 ? (
          <p className="text-[13px] text-muted">
            Reenviar código em{" "}
            <b className="num">
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </b>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={busy}
            className="min-h-touch w-fit text-sm font-semibold underline underline-offset-4"
          >
            Reenviar código
          </button>
        )}
        <p className="text-xs text-muted-2">O código vale por 10 minutos.</p>
      </div>
    );
  }

  return (
    <form onSubmit={sendCode} className="flex flex-1 flex-col gap-4" noValidate>
      {backHref ? (
        <IconButton label="Voltar" onClick={() => router.push(backHref)} className="border-0 bg-paper">
          <Icon name="back" />
        </IconButton>
      ) : null}
      <h1 className="mt-2 text-[26px] font-bold tracking-tight">{title}</h1>
      <p className="text-[13px] text-muted">{subtitle}</p>
      <TextField
        label="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="voce@email.com"
        value={email}
        readOnly={Boolean(fixedEmail)}
        onChange={(e) => {
          setEmail(e.target.value);
          setEmailError(undefined);
        }}
        error={emailError}
      />
      <Button type="submit" fullWidth disabled={!emailValid} loading={busy}>
        Enviar código
      </Button>
      {googleEnabled ? (
        <>
          <div className="flex items-center gap-2.5 text-xs text-muted-2">
            <span className="h-px flex-1 bg-line" />
            ou
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button variant="secondary" fullWidth onClick={() => void google()} disabled={busy}>
            <b className="text-base">G</b> Continuar com Google
          </Button>
        </>
      ) : null}
      {footer}
    </form>
  );
}

function CodeInput({
  value,
  onChange,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
  disabled: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <label className={cn("relative block w-fit", invalid && "animate-shake")}>
      <span className="sr-only">Código de 6 dígitos</span>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <span aria-hidden className="flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "grid h-[58px] w-12 place-items-center rounded-field border-[1.5px] text-2xl font-bold",
              invalid
                ? "border-bad text-bad"
                : value[i]
                  ? "border-black"
                  : i === value.length
                    ? "border-black/60"
                    : "border-line-2",
            )}
          >
            {value[i] ?? ""}
          </span>
        ))}
      </span>
    </label>
  );
}

export function friendlyAuthError(code?: string, status?: number): string {
  if (code === "over_email_send_rate_limit" || status === 429)
    return "Muitos pedidos de código. Espere alguns minutos e tente de novo.";
  if (code === "otp_expired") return "Código incorreto ou vencido. Confira ou peça um novo.";
  if (code === "email_address_invalid") return "Esse e-mail não parece válido. Confira e tente de novo.";
  return "Não conseguimos continuar agora. Tente de novo.";
}
