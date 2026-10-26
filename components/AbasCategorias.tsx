import Link from "next/link";
import type { ReactNode } from "react";
import type { Filtros } from "@/lib/leiloes/tipos";

type Aba = { chave: string; rotulo: string; href: string; icone: ReactNode; ativa: (f: Filtros) => boolean };

const traco = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const ABAS: Aba[] = [
  {
    chave: "todos", rotulo: "Todos os leilões", href: "/",
    ativa: (f) => !f.tipo && !f.categoria && !f.encerra,
    icone: <svg viewBox="0 0 24 24" {...traco}><path d="M20 12 12 20l-8-8V4h8z" /><circle cx="8.5" cy="8.5" r="1.5" /></svg>,
  },
  {
    chave: "hoje", rotulo: "Encerra hoje", href: "/?encerra=hoje",
    ativa: (f) => f.encerra === "hoje",
    icone: <svg viewBox="0 0 24 24" {...traco}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>,
  },
  {
    chave: "judicial", rotulo: "Parcela em até 30x", href: "/?tipo=judicial",
    ativa: (f) => f.tipo === "judicial",
    icone: <svg viewBox="0 0 24 24" {...traco}><circle cx="12" cy="9" r="6" /><path d="M9 15 8 22l4-2 4 2-1-7" /><path d="M10.5 9h3M12 7v4" /></svg>,
  },
  {
    chave: "extra", rotulo: "Bancos e seguradoras", href: "/?tipo=extrajudicial",
    ativa: (f) => f.tipo === "extrajudicial",
    icone: <svg viewBox="0 0 24 24" {...traco}><path d="M3 10 12 4l9 6" /><path d="M5 10v9h14v-9" /><path d="M9 19v-5h6v5" /></svg>,
  },
  {
    chave: "carro", rotulo: "Carros", href: "/?categoria=carro",
    ativa: (f) => f.categoria === "carro",
    icone: <svg viewBox="0 0 24 24" {...traco}><path d="M3 14 5 8h14l2 6v5H3z" /><circle cx="7.5" cy="16.5" r="1.5" /><circle cx="16.5" cy="16.5" r="1.5" /><path d="M5 12h14" /></svg>,
  },
  {
    chave: "moto", rotulo: "Motos", href: "/?categoria=moto",
    ativa: (f) => f.categoria === "moto",
    icone: <svg viewBox="0 0 24 24" {...traco}><circle cx="5.5" cy="16.5" r="3.5" /><circle cx="18.5" cy="16.5" r="3.5" /><path d="M5.5 16.5 10 9h4l2 4h2.5" /><path d="M13 9V6h3" /></svg>,
  },
  {
    chave: "caminhao", rotulo: "Caminhões", href: "/?categoria=caminhao",
    ativa: (f) => f.categoria === "caminhao",
    icone: <svg viewBox="0 0 24 24" {...traco}><path d="M2 7h11v9H2z" /><path d="M13 10h4l3 3v3h-7" /><circle cx="6" cy="17.5" r="1.5" /><circle cx="17" cy="17.5" r="1.5" /></svg>,
  },
];

export function AbasCategorias({ filtros }: { filtros: Filtros }) {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="flex flex-col gap-4 py-5 md:flex-row md:items-start md:gap-8">
          <div className="shrink-0 md:w-[240px]">
            <h1 className="text-[28px] font-semibold leading-tight">Leilões</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Veículos de leilões judiciais e de bancos e seguradoras. Novos lotes todos os dias.
            </p>
          </div>
          <nav className="-mx-4 flex overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Tipos de leilão">
            {ABAS.map((aba) => {
              const ativa = aba.ativa(filtros);
              return (
                <Link
                  key={aba.chave}
                  href={aba.href}
                  className={`flex w-[118px] shrink-0 flex-col items-center gap-2 border-b-[3px] pb-3 pt-1 text-center text-sm leading-tight transition-colors md:w-[122px] ${
                    ativa ? "border-[var(--azul)] font-semibold text-neutral-900" : "border-transparent text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <span className={`h-12 w-12 ${ativa ? "text-[var(--azul)]" : "text-[var(--azul)]/80"}`}>{aba.icone}</span>
                  {aba.rotulo}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
