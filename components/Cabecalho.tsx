import Link from "next/link";

export function Cabecalho({ busca }: { busca?: string }) {
  return (
    <header className="bg-[var(--amarelo)] text-[var(--texto)]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
        <Link href="/" className="flex items-center gap-2" aria-label="Veículo Sem Juros — início">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--azul)] text-lg font-black text-white">V</span>
          <span className="text-lg font-bold leading-tight">
            Veículo <span className="font-light">Sem Juros</span>
          </span>
        </Link>

        <form action="/" className="order-last flex w-full flex-1 md:order-none md:w-auto" role="search">
          <input
            name="q"
            defaultValue={busca}
            placeholder="Buscar marca, modelo, cidade…"
            className="h-10 w-full rounded-l-sm bg-white px-4 text-[15px] shadow-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-[var(--azul)]"
          />
          <button type="submit" className="h-10 rounded-r-sm bg-white px-4 shadow-sm" aria-label="Buscar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-neutral-500">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
        </form>

        <nav className="ml-auto flex items-center gap-5 text-sm">
          <Link href="/?encerra=hoje" className="hidden hover:text-black sm:inline">Encerra hoje</Link>
          <Link href="/?tipo=judicial" className="hidden hover:text-black sm:inline">Parceláveis</Link>
          <Link href="/login" className="rounded-sm bg-[var(--azul)] px-4 py-2 font-semibold text-white hover:bg-[#2968c8]">
            Entrar
          </Link>
        </nav>
      </div>
      <div className="mx-auto hidden max-w-[1200px] gap-6 px-4 pb-2 text-sm text-neutral-700 md:flex">
        <Link href="/?categoria=carro" className="hover:text-black">Carros</Link>
        <Link href="/?categoria=moto" className="hover:text-black">Motos</Link>
        <Link href="/?categoria=caminhao" className="hover:text-black">Caminhões e pesados</Link>
        <Link href="/?tipo=judicial" className="hover:text-black">Leilões judiciais</Link>
        <Link href="/?tipo=extrajudicial" className="hover:text-black">Bancos e seguradoras</Link>
        <span className="ml-auto text-neutral-600">Como funciona · Oportunidade do dia · Ajuda</span>
      </div>
    </header>
  );
}
