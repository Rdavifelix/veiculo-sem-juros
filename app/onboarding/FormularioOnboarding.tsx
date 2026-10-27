"use client";

import { useActionState } from "react";
import { concluir } from "./actions";

export function FormularioOnboarding({ next }: { next: string }) {
  const [estado, acao, pendente] = useActionState(concluir, undefined);
  const campo = "mt-1 h-12 w-full rounded-sm border border-neutral-300 px-3 text-base outline-none focus:border-[var(--azul)]";
  return (
    <form action={acao} className="mt-5 space-y-4">
      <input type="hidden" name="next" value={next} />
      <p className="text-sm font-semibold text-neutral-800">Informe as 2 palavras-chave ditas no vídeo</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-neutral-700">1ª palavra-chave</span>
          <input name="palavra1" required autoComplete="off" autoCapitalize="none" className={campo} />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-700">2ª palavra-chave</span>
          <input name="palavra2" required autoComplete="off" autoCapitalize="none" className={campo} />
        </label>
      </div>
      {estado?.erro && <p className="rounded-sm bg-red-50 px-3 py-2 text-sm text-red-700">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className="h-12 w-full rounded-sm bg-[var(--azul)] text-base font-semibold text-white hover:bg-[#2968c8] disabled:opacity-60">
        {pendente ? "Conferindo…" : "Começar a usar a plataforma"}
      </button>
      <p className="text-center text-xs text-neutral-500">Não importa a ordem, maiúsculas ou acentos.</p>
    </form>
  );
}
