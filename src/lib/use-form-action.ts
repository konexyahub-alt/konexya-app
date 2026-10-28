"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * useActionState sem o "reset" automático do formulário depois do envio: em caso de erro, o que a
 * pessoa digitou continua nos campos.
 */
export function useFormAction<S>(action: (state: Awaited<S>, form: FormData) => Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, pending] = useActionState<S, FormData>(action, initial);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };
  return { state, pending, onSubmit };
}
