import Link from "next/link";
import type { Faceta, Filtros, ResultadoBusca } from "@/lib/leiloes/tipos";

function hrefCom(f: Filtros, mudanca: Partial<Record<keyof Filtros, string | undefined>>) {
  const p = new URLSearchParams();
  const todos = { ...f, ...mudanca, pagina: undefined } as Record<string, string | number | undefined>;
  for (const [k, v] of Object.entries(todos)) if (v !== undefined && v !== "") p.set(k, String(v));
  const qs = p.toString();
  return qs ? `/?${qs}` : "/";
}

function Grupo({ titulo, facetas, chave, filtros }: { titulo: string; facetas: Faceta[]; chave: keyof Filtros; filtros: Filtros }) {
  if (!facetas.length) return null;
  const atual = filtros[chave] as string | undefined;
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-base font-semibold">{titulo}</h3>
      <ul className="space-y-1.5 text-sm">
        {atual && (
          <li>
            <Link href={hrefCom(filtros, { [chave]: undefined })} className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-2.5 py-0.5 text-neutral-800">
              {facetas.find((x) => x.valor === atual)?.rotulo ?? atual} <span aria-hidden>×</span>
            </Link>
          </li>
        )}
        {facetas
          .filter((x) => x.valor !== atual)
          .map((x) => (
            <li key={x.valor}>
              <Link href={hrefCom(filtros, { [chave]: x.valor })} className="text-neutral-700 hover:text-neutral-900">
                {x.rotulo} <span className="text-neutral-400">({x.total})</span>
              </Link>
            </li>
          ))}
      </ul>
    </section>
  );
}

export function FiltrosLaterais({ resultado, filtros }: { resultado: ResultadoBusca; filtros: Filtros }) {
  const parcelaveis = filtros.tipo === "judicial";
  return (
    <aside className="order-2 w-full shrink-0 lg:order-none lg:w-[260px]">
      <h2 className="text-xl font-semibold">{filtros.q ? `“${filtros.q}”` : "Todos"}</h2>
      <p className="text-sm text-neutral-600">{resultado.total.toLocaleString("pt-BR")} leilões</p>

      <Link
        href={hrefCom(filtros, { tipo: parcelaveis ? undefined : "judicial" })}
        className="mt-5 flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white p-4 shadow-sm"
      >
        <div>
          <p className="text-[15px] leading-tight">
            <span className="text-[var(--azul)]" aria-hidden>⚡ </span>
            <span className="font-semibold">Parcelável</span> em até 30x
          </p>
          <p className="mt-1 text-xs leading-snug text-neutral-500">Só leilão judicial admite entrada de 25% e parcelamento</p>
        </div>
        <span className={`relative inline-block h-6 w-11 shrink-0 rounded-full transition-colors ${parcelaveis ? "bg-[var(--azul)]" : "bg-neutral-300"}`} aria-hidden>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${parcelaveis ? "left-[22px]" : "left-0.5"}`} />
        </span>
      </Link>

      <section className="mt-6">
        <h3 className="mb-2 text-base font-semibold">Encerramento</h3>
        <ul className="space-y-1.5 text-sm">
          {(
            [
              ["hoje", "Encerra hoje"],
              ["7dias", "Próximos 7 dias"],
            ] as const
          ).map(([v, r]) => (
            <li key={v}>
              <Link href={hrefCom(filtros, { encerra: filtros.encerra === v ? undefined : v })} className={filtros.encerra === v ? "font-semibold" : "text-neutral-700 hover:text-neutral-900"}>
                {r}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Grupo titulo="Tipo de leilão" facetas={resultado.facetas.tipo} chave="tipo" filtros={filtros} />
      <Grupo titulo="Categoria" facetas={resultado.facetas.categoria} chave="categoria" filtros={filtros} />
      <Grupo titulo="Preço" facetas={resultado.facetas.preco} chave="preco" filtros={filtros} />
      <Grupo titulo="Estado" facetas={resultado.facetas.uf} chave="uf" filtros={filtros} />
      <Grupo titulo="Marca" facetas={resultado.facetas.marca} chave="marca" filtros={filtros} />
    </aside>
  );
}
