import Link from "next/link";
import type { Sessao } from "@/lib/auth";
import type { Carteira } from "@/lib/creditos";
import { sair } from "@/app/login/actions";

export function Cabecalho({ usuario, carteira }: { usuario?: Sessao | null; carteira?: Carteira | null }) {
  return (
    <header className="bg-[var(--amarelo)] text-[var(--texto)]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
        <Link href={usuario ? "/busca" : "/"} className="flex items-center gap-2" aria-label="Veículo Sem Juros — início">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--azul)] text-lg font-black text-white">V</span>
          <span className="text-lg font-bold leading-tight">
            Veículo <span className="font-light">Sem Juros</span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-5 text-sm">
          {usuario ? (
            <>
              <Link href="/busca" className="hidden hover:text-black sm:inline">Busca</Link>
              <Link href="/desbloqueados" className="hidden hover:text-black sm:inline">Desbloqueados</Link>
              {carteira && (
                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold" title="Créditos disponíveis">
                  {carteira.saldo} {carteira.saldo === 1 ? "crédito" : "créditos"}
                </span>
              )}
              <span className="hidden text-neutral-700 md:inline">Olá, {usuario.nome.split(" ")[0]}</span>
              <form action={sair}>
                <button type="submit" className="rounded-sm border border-neutral-700/30 px-3 py-1.5 font-semibold hover:bg-white/50">Sair</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/#como-funciona" className="hidden hover:text-black sm:inline">Como funciona</Link>
              <Link href="/login" className="rounded-sm bg-[var(--azul)] px-4 py-2 font-semibold text-white hover:bg-[#2968c8]">
                Entrar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
