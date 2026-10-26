import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LeilaoVitrine } from "./tipos";
import { paraVitrine } from "./repositorio";
import { parcelamentoVedado } from "./parcelamento";
import type { Leilao } from "./tipos";

export interface Documento {
  nome: string;
  url: string;
  tipo: string;
}

/** Ficha completa de um lote: tudo que a view pública expõe + o que só sai após desbloqueio. */
export interface DetalheLeilao extends LeilaoVitrine {
  fotosTodas: string[];
  descricaoCompleta: string | null;
  documentos: Documento[];
  paginaLeilao: string | null;
  condicoes: string | null;
  processo: string | null;
  autor: string | null;
  executado: string | null;
  praca1: string | null;
  praca2: string | null;
  km: number | null;
  placa: string | null;
  combustivel: string | null;
  cor: string | null;
  financiavel: string | null;
  entradaMinPct: number | null;
  maxParcelas: number | null;
  leiloeiroNome: string | null;
}

const num = (v: unknown) => (v == null || v === "" ? null : Number(v));
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Lê a linha completa da view (todas as fotos, descrição inteira, extras). Não inclui `fonte_url`. */
export async function detalheLeilao(id: string): Promise<DetalheLeilao | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("auctions_vitrine").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  const extras = (r.extras as Record<string, unknown> | null) ?? {};
  const base: Leilao = {
    id: String(r.id),
    fonte: String(r.fonte),
    fonte_url: "",
    external_id: String(r.external_id),
    titulo: String(r.titulo),
    descricao: (r.descricao as string | null) ?? null,
    marca: (r.marca as string | null) ?? null,
    modelo: (r.modelo as string | null) ?? null,
    ano: num(r.ano),
    cidade: (r.cidade as string | null) ?? null,
    uf: (r.uf as string | null) ?? null,
    tipo: (r.tipo as Leilao["tipo"]) ?? "nd",
    lance_1: num(r.lance_1),
    lance_2: num(r.lance_2),
    lance_atual: num(r.lance_atual),
    encerra_em: (r.encerra_em as string | null) ?? null,
    fotos: (r.fotos as string[] | null) ?? [],
    raw: {
      ...extras,
      sinistro: (r.sinistro as { tipo?: string } | null)?.tipo ?? extras.sinistro ?? null,
      parcelamento_vedado: parcelamentoVedado(r.descricao as string | null, extras.condicoes as string | undefined, extras.autor as string | undefined, extras.leilao as string | undefined),
    },
  };
  const vitrine = paraVitrine(base);
  const documentos = Array.isArray(extras.documentos)
    ? (extras.documentos as Documento[]).filter((d) => d && typeof d.url === "string" && /^https?:\/\//.test(d.url))
    : [];
  return {
    ...vitrine,
    fotosTodas: base.fotos,
    descricaoCompleta: base.descricao,
    documentos,
    paginaLeilao: str(extras.pagina_leilao),
    condicoes: str(extras.condicoes),
    processo: str(extras.processo),
    autor: str(extras.autor),
    executado: str(extras.executado),
    praca1: str(extras.praca_1),
    praca2: str(extras.praca_2),
    km: num(extras.km),
    placa: str(extras.placa),
    combustivel: str(extras.combustivel),
    cor: str(extras.cor),
    financiavel: str(extras.financiavel),
    entradaMinPct: num(extras.entrada_min_pct),
    maxParcelas: num(extras.max_parcelas),
    leiloeiroNome: str(extras.leiloeiro),
  };
}
