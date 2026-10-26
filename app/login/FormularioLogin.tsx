"use client";

import Link from "next/link";
import { useActionState } from "react";
import { entrar } from "./actions";

export function FormularioLogin({ next }: { next: string }) {
  const [estado, acao, pendente] = useActionState(entrar, undefined);
  return (
    <form className="mt-6 space-y-4" action={acao}>
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm">
        <span className="text-neutral-700">E-mail</span>
        <input name="email" type="email" required autoComplete="email" className="mt-1 h-11 w-full rounded-sm border border-neutral-300 px-3 outline-none focus:border-[var(--azul)]" />
      </label>
      <label className="block text-sm">
        <span className="text-neutral-700">Senha</span>
        <input name="senha" type="password" required autoComplete="current-password" className="mt-1 h-11 w-full rounded-sm border border-neutral-300 px-3 outline-none focus:border-[var(--azul)]" />
      </label>
      {estado?.erro && <p className="rounded-sm bg-red-50 px-3 py-2 text-sm text-red-700">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className="h-11 w-full rounded-sm bg-[var(--azul)] font-semibold text-white disabled:opacity-60">
        {pendente ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-xs text-neutral-500">
        <Link href="/login/esqueci" className="text-[var(--azul)]">Esqueceu sua senha?</Link> · Ainda não tem acesso? Fale com a gente no WhatsApp.
      </p>
    </form>
  );
}
