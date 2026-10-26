"use client";

import Link from "next/link";
import { useActionState } from "react";
import { definirNovaSenha } from "../actions";

export default function NovaSenha() {
  const [estado, acao, pendente] = useActionState(definirNovaSenha, undefined);
  return (
    <main className="min-h-screen bg-[var(--fundo)]">
      <div className="bg-[var(--amarelo)] px-4 py-3">
        <Link href="/" className="mx-auto block max-w-[1200px] text-lg font-bold">
          Veículo <span className="font-light">Sem Juros</span>
        </Link>
      </div>
      <div className="mx-auto mt-16 max-w-sm rounded-md bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Nova senha</h1>
        <form className="mt-6 space-y-4" action={acao}>
          <label className="block text-sm">
            <span className="text-neutral-700">Nova senha (mínimo 8 caracteres)</span>
            <input name="senha" type="password" required minLength={8} autoComplete="new-password" className="mt-1 h-11 w-full rounded-sm border border-neutral-300 px-3 outline-none focus:border-[var(--azul)]" />
          </label>
          {estado?.erro && <p className="rounded-sm bg-red-50 px-3 py-2 text-sm text-red-700">{estado.erro}</p>}
          <button type="submit" disabled={pendente} className="h-11 w-full rounded-sm bg-[var(--azul)] font-semibold text-white disabled:opacity-60">
            {pendente ? "Salvando…" : "Salvar e entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
