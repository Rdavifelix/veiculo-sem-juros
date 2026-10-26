import type { Metadata } from "next";
import Link from "next/link";
import { AbasCategorias } from "@/components/AbasCategorias";
import { Cabecalho } from "@/components/Cabecalho";
import { CardLeilao } from "@/components/CardLeilao";
import { FiltrosLaterais } from "@/components/FiltrosLaterais";
import { Rodape } from "@/components/Rodape";
import { listar, ROTULO_CATEGORIA, ROTULO_TIPO } from "@/lib/leiloes/repositorio";
import type { Categoria, Filtros, TipoLeilao } from "@/lib/leiloes/tipos";

type Params = Record<string, string | string[] | undefined>;

function lerFiltros(sp: Params): Filtros {
  const um = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) as string | undefined;
  const tipo = um("tipo");
  const categoria = um("categoria");
  const preco = um("preco");
  const encerra = um("encerra");
  const ordem = um("ordem");
  return {
    q: um("q") || undefined,
    tipo: tipo && tipo in ROTULO_TIPO ? (tipo as TipoLeilao) : undefined,
    categoria: categoria && categoria in ROTULO_CATEGORIA ? (categoria as Categoria) : undefined,
    uf: um("uf")?.toUpperCase().slice(0, 2) || undefined,
    marca: um("marca") || undefined,
    preco: preco && ["ate20", "20a50", "50a100", "acima100"].includes(preco) ? (preco as Filtros["preco"]) : undefined,
    encerra: encerra === "hoje" || encerra === "7dias" ? encerra : undefined,
    ordem: ordem === "menor" || ordem === "encerra" ? ordem : "maior",
    pagina: Math.max(1, Number(um("pagina") ?? 1) || 1),
  };
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const f = lerFiltros(await searchParams);
  const partes = [f.q, f.marca, f.categoria && ROTULO_CATEGORIA[f.categoria], f.tipo && `leilão ${ROTULO_TIPO[f.tipo].toLowerCase()}`, f.uf].filter(Boolean);
  return {
    title: partes.length ? `Leilões de veículos: ${partes.join(", ")}` : "Leilões de veículos com parcelamento",
    description: "Buscador de leilões de veículos judiciais e extrajudiciais. Encontre carros, motos e caminhões com entrada de 25% e até 30 parcelas.",
  };
}

export default async function Home({ searchParams }: { searchParams: Promise<Params> }) {
  const filtros = lerFiltros(await searchParams);
  const resultado = await listar(filtros);

  const hrefPagina = (n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filtros)) if (v !== undefined && k !== "pagina" && !(k === "ordem" && v === "maior")) p.set(k, String(v));
    if (n > 1) p.set("pagina", String(n));
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  };
  const hrefOrdem = (o: NonNullable<Filtros["ordem"]>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filtros, ordem: o, pagina: undefined })) if (v !== undefined && !(k === "ordem" && v === "maior")) p.set(k, String(v));
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <>
      <Cabecalho busca={filtros.q} />
      <AbasCategorias filtros={filtros} />
      <main className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-8 lg:flex-row">
        <FiltrosLaterais resultado={resultado} filtros={filtros} />

        <section className="flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
            <span>
              {resultado.total.toLocaleString("pt-BR")} leilões encontrados
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {resultado.itens.map((l) => (
                <CardLeilao key={l.id} leilao={l} />
              ))}
            </div>
          ) : (
            <div className="rounded-md bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-semibold">Nenhum leilão com esses filtros</p>
              <p className="mt-1 text-sm text-neutral-600">Tente remover um filtro ou buscar por outro termo.</p>
              <Link href="/" className="mt-4 inline-block text-sm font-semibold text-[var(--azul)]">Ver todos os leilões</Link>
            </div>
          )}

          {resultado.totalPaginas > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2 text-sm" aria-label="Paginação">
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
      </main>
      <Rodape />
    </>
  );
}
