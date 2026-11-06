"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Envia o formulário para uma action do useActionState SEM limpar os campos.
 * (Com `action={...}` o React 19 reseta o formulário após o envio, e o usuário
 * perderia o que digitou quando a validação falha.)
 */
export function submitKeepingValues(dispatch: (data: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };
}
