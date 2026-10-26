import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraBusca } from "@/components/BarraBusca";
import { Cabecalho } from "@/components/Cabecalho";
import { CardLeilao } from "@/components/CardLeilao";
import { Rodape } from "@/components/Rodape";
import { usuarioAtual } from "@/lib/auth";
import { buscaPaga, carteira, filtrosDaBusca, idsDesbloqueados } from "@/lib/creditos";
import { hrefCom, lerFiltros } from "@/lib/leiloes/filtros";
import { listar, MAX_RESULTADOS_BUSCA, totalGeral } from "@/lib/leiloes/repositorio";
import type { Filtros } from "@/lib/leiloes/tipos";
import { buscar } from "./actions";

export const metadata: Metadata = { title: "Busca", robots: { index: false } };

type Params = Record<string, string | string[] | undefined>;

function mesmosFiltros(a: Record<string, string>, b: Record<string, string>) {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
}

export default async function Busca({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login?next=/busca");

  const sp = await searchParams;
  const filtros = lerFiltros(sp);
  const s = typeof sp.s === "string" ? sp.s : undefined;
  const erro = typeof sp.erro === "string" ? sp.erro : undefined;

  // A busca só mostra resultados quando foi paga (ou registrada como vazia) via POST em "Buscar".
  // Abrir uma URL com filtros mas sem `s` válido mostra a barra preenchida e pede o clique.
  const chave = filtrosDaBusca(filtros);
  const paga = s ? await buscaPaga(s) : null;
  const liberada = paga !== null && mesmosFiltros(paga, chave);

  const [cart, total, desbloqueados, resultado, facetasBase] = await Promise.all([
    carteira(),
    totalGeral(),
    idsDesbloqueados(),
    liberada ? listar(filtros, { maximo: MAX_RESULTADOS_BUSCA }) : null,
    listar({}, { maximo: 1 }), // só para as facetas de marca na barra
  ]);

  const hrefOrdem = (o: NonNullable<Filtros["ordem"]>) => hrefCom("/busca", { ...filtros, ordem: o, pagina: 1 }, { s });
  const hrefPagina = (n: number) => hrefCom("/busca", { ...filtros, pagina: n }, { s });

  return (
    <>
      <Cabecalho usuario={usuario} carteira={cart} />
      <main className="mx-auto max-w-[1200px] px-4 py-6">
        <div className="mb-3 flex items-center gap-6 text-sm">
          <span className="border-b-2 border-[var(--azul)] pb-1 font-semibold">Buscar</span>
          <Link href="/desbloqueados" className="pb-1 text-neutral-600 hover:text-neutral-900">Desbloqueados</Link>
          <span className="ml-auto text-right text-neutral-600">
            <strong className="text-neutral-900">{cart.saldo}</strong> créditos<span className="hidden md:inline"> · 1 crédito por busca com resultado ou por link desbloqueado</span>
          </span>
        </div>

        <BarraBusca filtros={filtros} marcas={facetasBase.facetas.marca} carteira={cart} acao={buscar} />
        <p className="mt-2 text-xs text-neutral-600">
          <span aria-hidden>ⓘ </span>Cada busca mostra até <strong>{MAX_RESULTADOS_BUSCA} veículos</strong>. Use marca, estado, preço e data para chegar direto nos que interessam. Busca sem resultado não gasta crédito.
        </p>

        {erro === "sem_creditos" && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Você está sem créditos. Fale com a gente no WhatsApp para recarregar.
          </div>
        )}

        {resultado ? (
          <section className="mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
              <span>
                <strong className="text-neutral-900">{resultado.total.toLocaleString("pt-BR")}</strong> leilões encontrados em {total.toLocaleString("pt-BR")} ativos
                {resultado.totalPaginas > 1 && ` · página ${resultado.pagina} de ${resultado.totalPaginas}`}
              </span>
              <span className="flex items-center gap-3">
                Ordenar por
                {(
                  [
                    ["maior", "Maior lance"],
                    ["menor", "Menor lance"],
                    ["encerra", "Encerra antes"],
                  ] as const
                ).map(([o, r]) => (
                  <Link key={o} href={hrefOrdem(o)} className={filtros.ordem === o ? "font-semibold text-[var(--azul)]" : "hover:text-neutral-900"}>
                    {r}
                  </Link>
                ))}
              </span>
            </div>

            {resultado.itens.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {resultado.itens.map((l) => (
                  <CardLeilao key={l.id} leilao={l} logado desbloqueado={desbloqueados.has(l.id)} />
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-white p-10 text-center shadow-sm">
                <p className="text-lg font-semibold">Nenhum leilão com esses filtros</p>
                <p className="mt-1 text-sm text-neutral-600">Essa busca não gastou crédito. Tente afrouxar um filtro.</p>
              </div>
            )}

            {resultado.totalPaginas > 1 && (
              <nav className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm" aria-label="Paginação">
                {resultado.pagina > 1 && <Link href={hrefPagina(resultado.pagina - 1)} className="rounded-sm px-3 py-1.5 text-[var(--azul)] hover:bg-white">‹ Anterior</Link>}
                {Array.from({ length: resultado.totalPaginas }, (_, i) => i + 1).map((n) => (
                  <Link key={n} href={hrefPagina(n)} className={`rounded-sm px-3 py-1.5 ${n === resultado.pagina ? "bg-white font-semibold shadow-sm" : "text-neutral-700 hover:bg-white"}`}>
                    {n}
                  </Link>
                ))}
                {resultado.pagina < resultado.totalPaginas && <Link href={hrefPagina(resultado.pagina + 1)} className="rounded-sm px-3 py-1.5 text-[var(--azul)] hover:bg-white">Seguinte ›</Link>}
              </nav>
            )}
            <p className="mt-10 rounded-md bg-white p-5 text-center text-sm text-neutral-600 shadow-sm">
              Não encontrou o leilão que procurava? <span className="font-semibold text-[var(--azul)]">Avise a gente</span>
            </p>
          </section>
        ) : (
          <section className="mt-10 rounded-md bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold">{Object.keys(chave).length ? "Clique em Buscar para ver os resultados" : "Comece pela barra acima"}</p>
            <p className="mt-1 text-sm text-neutral-600">
              Hoje há <strong>{total.toLocaleString("pt-BR")}</strong> leilões ativos. Digite um modelo ou escolha os filtros e clique em <strong>Buscar</strong>.
            </p>
          </section>
        )}
      </main>
      <Rodape />
    </>
  );
}
