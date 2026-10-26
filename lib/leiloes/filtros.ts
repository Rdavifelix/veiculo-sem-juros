import type { Categoria, Filtros, TipoLeilao } from "./tipos";

const TIPOS: TipoLeilao[] = ["judicial", "extrajudicial", "nd"];
const CATEGORIAS: Categoria[] = ["carro", "moto", "caminhao", "outro"];
const PRECOS = ["ate20", "20a50", "50a100", "acima100"] as const;

type Params = Record<string, string | string[] | undefined>;

/** Converte query string (ou FormData achatado) em filtros validados. */
export function lerFiltros(sp: Params): Filtros {
  const um = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) as string | undefined;
  const tipo = um("tipo");
  const categoria = um("categoria");
  const preco = um("preco");
  const encerra = um("encerra");
  const ordem = um("ordem");
  return {
    q: um("q")?.trim().slice(0, 80) || undefined,
    tipo: tipo && (TIPOS as string[]).includes(tipo) ? (tipo as TipoLeilao) : undefined,
    categoria: categoria && (CATEGORIAS as string[]).includes(categoria) ? (categoria as Categoria) : undefined,
    uf: um("uf")?.toUpperCase().slice(0, 2) || undefined,
    marca: um("marca")?.toLowerCase().slice(0, 40) || undefined,
    preco: preco && (PRECOS as readonly string[]).includes(preco) ? (preco as Filtros["preco"]) : undefined,
    encerra: encerra === "hoje" || encerra === "7dias" ? encerra : undefined,
    ordem: ordem === "menor" || ordem === "encerra" ? ordem : "maior",
    pagina: Math.max(1, Number(um("pagina") ?? 1) || 1),
  };
}

/** Monta a query string a partir dos filtros, preservando extras (ex.: `s` da busca paga). */
export function hrefCom(base: string, f: Filtros, extras: Record<string, string | undefined> = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === "") continue;
    if (k === "ordem" && v === "maior") continue;
    if (k === "pagina" && Number(v) <= 1) continue;
    p.set(k, String(v));
  }
  for (const [k, v] of Object.entries(extras)) if (v) p.set(k, v);
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}
