import "server-only";
import semente from "@/data/seed/leiloes.json";
import type { Categoria, Faceta, Filtros, Leilao, LeilaoVitrine, ResultadoBusca, TipoLeilao } from "./tipos";

/**
 * Fonte de dados da vitrine. Hoje lê a base semente (`data/seed/leiloes.json`, coletada por
 * `scripts/coleta/`). Quando o projeto Supabase existir, `listar` passa a consultar a tabela
 * `auctions` com os mesmos filtros — a interface não muda.
 */
const POR_PAGINA = 24;

const NOMES_FONTE: Record<string, string> = {
  sodresantoro: "Sodré Santoro",
  superbid: "Superbid",
  suporteleiloes: "Suporte Leilões",
  leilotech: "Leilotech",
};

const UFS: Record<string, string> = {
  SP: "São Paulo", PR: "Paraná", RJ: "Rio de Janeiro", MG: "Minas Gerais", GO: "Goiás", SC: "Santa Catarina",
  RS: "Rio Grande do Sul", BA: "Bahia", DF: "Distrito Federal", ES: "Espírito Santo", PE: "Pernambuco", CE: "Ceará",
};

function categoriaDe(l: Leilao): Categoria {
  const cat = String(l.raw.categoria ?? "").toLowerCase();
  const texto = `${l.titulo} ${cat}`.toLowerCase();
  // \b evita "automotor" casar com "moto".
  if (/\bmotos?\b|motocicleta|scooter|ciclomotor|\bmotoneta/.test(texto) && !/motor ?home/.test(texto)) return "moto";
  if (/caminh|ônibus|onibus|carreta|cavalo mec|trator|retroescav|empilhadeira|\bvan\b|micro-?ônibus|\bcrm\b|\baxor\b|\batego\b|\bconstellation\b/.test(texto)) return "caminhao";
  if (/carro|automóvel|automovel|veículo|veiculo|sedan|hatch|\bsuv\b|picape|pickup|utilit/.test(texto) || cat === "carros") return "carro";
  if (l.marca && /^(yamaha|suzuki|kawasaki|shineray|dafra|haojue|bajaj|royal enfield|ducati|harley|triumph|sundown)$/i.test(l.marca.trim())) return "moto";
  if (l.marca && /^honda$/i.test(l.marca.trim()) && /\b(cg|biz|pop|fan|titan|bros|xre|cb|pcx|nxr|twister|hornet|lead|elite|adv|sh\d|nc\d|crf|xr\d)/i.test(l.titulo)) return "moto";
  return l.marca ? "carro" : "outro";
}

export function paraVitrine(l: Leilao): LeilaoVitrine {
  const [plataformaRaw, host] = l.fonte.split(":");
  const nomePlataforma = NOMES_FONTE[plataformaRaw] ?? plataformaRaw;
  const loja = l.raw.loja as string | undefined;
  const comitente = l.raw.comitente as string | undefined;
  // "LUXENA por Alpha Ecom" no modelo → aqui: LEILOEIRO por Plataforma, e o comitente (banco/seguradora) à parte.
  const leiloeiro = host
    ? host.replace(/\.com\.br$|\.com$|\.leilao\.br$/, "").toUpperCase()
    : (loja ?? nomePlataforma).toUpperCase();
  const plataforma = host || (loja && loja.toLowerCase() !== nomePlataforma.toLowerCase()) ? nomePlataforma : null;
  const marca = l.marca && !/automotor|ve[ií]culo|^\W|^lote$|^\d/i.test(l.marca) ? l.marca : null;
  const valor = l.lance_atual ?? l.lance_2 ?? l.lance_1;
  const valorDe = l.lance_2 && l.lance_1 && l.lance_1 > l.lance_2 ? l.lance_1 : null;
  const descontoPct = valorDe && valor ? Math.round((1 - valor / valorDe) * 100) : null;
  return {
    id: l.id,
    fonte: l.fonte,
    external_id: l.external_id,
    titulo: l.titulo,
    descricao: l.descricao,
    marca,
    modelo: l.modelo,
    ano: l.ano,
    cidade: l.cidade,
    uf: l.uf,
    tipo: l.tipo,
    lance_1: l.lance_1,
    lance_2: l.lance_2,
    lance_atual: l.lance_atual,
    encerra_em: l.encerra_em,
    fotos: l.fotos,
    categoria: categoriaDe(l),
    leiloeiro,
    plataforma,
    comitente: comitente ? comitente.replace(/\s+s\.?a\.?$/i, "").toUpperCase() : null,
    sinistro: (l.raw.sinistro as string | undefined) ?? null,
    visitas: (l.raw.visitas as number | undefined) ?? null,
    lances: (l.raw.lances as number | undefined) ?? null,
    valor,
    valorDe,
    descontoPct,
    parcelavel: l.tipo === "judicial",
  };
}

// Lotes já encerrados saem da vitrine (na tabela isso será `status = 'ativo'`).
const TODOS: LeilaoVitrine[] = (semente as Leilao[]).map(paraVitrine).filter((l) => !l.encerra_em || new Date(l.encerra_em) > new Date());

function faixaPreco(v: number | null): Filtros["preco"] | null {
  if (v == null) return null;
  if (v < 20_000) return "ate20";
  if (v < 50_000) return "20a50";
  if (v < 100_000) return "50a100";
  return "acima100";
}

function inicioDoDia(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function aplicar(itens: LeilaoVitrine[], f: Filtros, ignorar?: keyof Filtros) {
  const q = f.q?.trim().toLowerCase();
  const hoje = inicioDoDia(new Date());
  const fimHoje = new Date(hoje.getTime() + 86_400_000);
  const em7 = new Date(hoje.getTime() + 7 * 86_400_000);
  return itens.filter((l) => {
    if (ignorar !== "q" && q && !`${l.titulo} ${l.marca ?? ""} ${l.modelo ?? ""} ${l.cidade ?? ""} ${l.descricao ?? ""}`.toLowerCase().includes(q)) return false;
    if (ignorar !== "tipo" && f.tipo && l.tipo !== f.tipo) return false;
    if (ignorar !== "categoria" && f.categoria && l.categoria !== f.categoria) return false;
    if (ignorar !== "uf" && f.uf && l.uf !== f.uf) return false;
    if (ignorar !== "marca" && f.marca && (l.marca ?? "").toLowerCase() !== f.marca.toLowerCase()) return false;
    if (ignorar !== "preco" && f.preco && faixaPreco(l.valor) !== f.preco) return false;
    if (ignorar !== "encerra" && f.encerra) {
      const d = l.encerra_em ? new Date(l.encerra_em) : null;
      if (!d) return false;
      if (f.encerra === "hoje" && (d < hoje || d >= fimHoje)) return false;
      if (f.encerra === "7dias" && (d < hoje || d >= em7)) return false;
    }
    return true;
  });
}

function contar(itens: LeilaoVitrine[], chave: (l: LeilaoVitrine) => string | null, rotulo: (v: string) => string, limite = 12): Faceta[] {
  const mapa = new Map<string, number>();
  for (const l of itens) {
    const v = chave(l);
    if (v) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([valor, total]) => ({ valor, rotulo: rotulo(valor), total }));
}

export const ROTULO_TIPO: Record<TipoLeilao, string> = { judicial: "Judicial", extrajudicial: "Extrajudicial", nd: "Não informado" };
export const ROTULO_CATEGORIA: Record<Categoria, string> = { carro: "Carros", moto: "Motos", caminhao: "Caminhões e pesados", outro: "Outros" };
export const ROTULO_PRECO: Record<NonNullable<Filtros["preco"]>, string> = {
  ate20: "Até R$ 20 mil",
  "20a50": "R$ 20 mil a R$ 50 mil",
  "50a100": "R$ 50 mil a R$ 100 mil",
  acima100: "Acima de R$ 100 mil",
};

export async function listar(f: Filtros): Promise<ResultadoBusca> {
  const filtrados = aplicar(TODOS, f);
  const ordem = f.ordem ?? "maior";
  filtrados.sort((a, b) => {
    if (ordem === "encerra") return (a.encerra_em ?? "9").localeCompare(b.encerra_em ?? "9");
    const va = a.valor ?? 0;
    const vb = b.valor ?? 0;
    return ordem === "menor" ? va - vb : vb - va;
  });
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, f.pagina ?? 1), totalPaginas);
  const ordemPreco: NonNullable<Filtros["preco"]>[] = ["ate20", "20a50", "50a100", "acima100"];
  return {
    itens: filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    total: filtrados.length,
    pagina,
    totalPaginas,
    facetas: {
      tipo: contar(aplicar(TODOS, f, "tipo"), (l) => l.tipo, (v) => ROTULO_TIPO[v as TipoLeilao]),
      categoria: contar(aplicar(TODOS, f, "categoria"), (l) => l.categoria, (v) => ROTULO_CATEGORIA[v as Categoria]),
      uf: contar(aplicar(TODOS, f, "uf"), (l) => l.uf, (v) => UFS[v] ?? v),
      marca: contar(aplicar(TODOS, f, "marca"), (l) => l.marca?.toLowerCase() ?? null, (v) => v.charAt(0).toUpperCase() + v.slice(1)),
      preco: contar(aplicar(TODOS, f, "preco"), (l) => faixaPreco(l.valor) ?? null, (v) => ROTULO_PRECO[v as NonNullable<Filtros["preco"]>]).sort(
        (a, b) => ordemPreco.indexOf(a.valor as NonNullable<Filtros["preco"]>) - ordemPreco.indexOf(b.valor as NonNullable<Filtros["preco"]>),
      ),
    },
  };
}

export function totalGeral() {
  return TODOS.length;
}
