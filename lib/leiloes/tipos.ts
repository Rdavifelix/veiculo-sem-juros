export type TipoLeilao = "judicial" | "extrajudicial" | "nd";
export type Categoria = "carro" | "moto" | "caminhao" | "outro";

/** Registro de lote como sai dos coletores (`scripts/coleta/lib.mjs`) e como viverá na tabela `auctions`. */
export interface Leilao {
  id: string;
  fonte: string;
  /** Link do lote no leiloeiro. Só vai ao cliente após desbloqueio — nunca renderizar direto. */
  fonte_url: string;
  external_id: string;
  titulo: string;
  descricao: string | null;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  cidade: string | null;
  uf: string | null;
  tipo: TipoLeilao;
  lance_1: number | null;
  lance_2: number | null;
  lance_atual: number | null;
  encerra_em: string | null;
  fotos: string[];
  raw: Record<string, unknown>;
}

/** Leilão enriquecido para exibição (campos derivados, sem a URL da fonte). */
export interface LeilaoVitrine extends Omit<Leilao, "fonte_url" | "raw"> {
  categoria: Categoria;
  leiloeiro: string;
  plataforma: string | null;
  /** Banco/seguradora/exequente que vende o bem, quando a fonte informa. */
  comitente: string | null;
  sinistro: string | null;
  visitas: number | null;
  lances: number | null;
  /** Valor em destaque: lance atual, senão 2ª praça, senão 1ª praça. */
  valor: number | null;
  /** Valor riscado quando há desconto (1ª praça ou lance inicial). */
  valorDe: number | null;
  descontoPct: number | null;
  /** Só leilão judicial admite parcelamento (entrada 25%, até 30x). */
  parcelavel: boolean;
}

export interface Filtros {
  q?: string;
  tipo?: TipoLeilao;
  categoria?: Categoria;
  uf?: string;
  marca?: string;
  preco?: "ate20" | "20a50" | "50a100" | "acima100";
  encerra?: "hoje" | "7dias";
  ordem?: "maior" | "menor" | "encerra";
  pagina?: number;
}

export interface Faceta {
  valor: string;
  rotulo: string;
  total: number;
}

export interface ResultadoBusca {
  itens: LeilaoVitrine[];
  total: number;
  pagina: number;
  totalPaginas: number;
  facetas: {
    tipo: Faceta[];
    categoria: Faceta[];
    uf: Faceta[];
    marca: Faceta[];
    preco: Faceta[];
  };
}
