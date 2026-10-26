"use client";

import Link from "next/link";
import { useActionState } from "react";
import { pedirRedefinicao } from "../actions";

export default function Esqueci() {
  const [estado, acao, pendente] = useActionState(pedirRedefinicao, undefined);
  return (
    <main className="min-h-screen bg-[var(--fundo)]">
      <div className="bg-[var(--amarelo)] px-4 py-3">
        <Link href="/" className="mx-auto block max-w-[1200px] text-lg font-bold">
          Veículo <span className="font-light">Sem Juros</span>
        </Link>
      </div>
      <div className="mx-auto mt-16 max-w-sm rounded-md bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Redefinir senha</h1>
        {estado?.ok ? (
          <p className="mt-3 text-sm text-neutral-700">Se esse e-mail tiver conta, enviamos um link para criar uma nova senha. Confira também o spam.</p>
        ) : (
          <form className="mt-6 space-y-4" action={acao}>
            <label className="block text-sm">
              <span className="text-neutral-700">E-mail da sua conta</span>
              <input name="email" type="email" required className="mt-1 h-11 w-full rounded-sm border border-neutral-300 px-3 outline-none focus:border-[var(--azul)]" />
            </label>
            {estado?.erro && <p className="rounded-sm bg-red-50 px-3 py-2 text-sm text-red-700">{estado.erro}</p>}
            <button type="submit" disabled={pendente} className="h-11 w-full rounded-sm bg-[var(--azul)] font-semibold text-white disabled:opacity-60">
              {pendente ? "Enviando…" : "Enviar link"}
            </button>
          </form>
        )}
        <p className="mt-4 text-center text-xs"><Link href="/login" className="text-[var(--azul)]">Voltar para o login</Link></p>
      </div>
    </main>
  );
}
