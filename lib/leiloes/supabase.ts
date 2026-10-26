import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Leilao, TipoLeilao } from "./tipos";

/** Colunas da view pública `auctions_vitrine` que a vitrine usa (sem `fonte_url`; `extras` é o raw podado). */
const COLUNAS =
  "id,fonte,external_id,titulo,descricao,marca,modelo,ano,cidade,uf,tipo,lance_1,lance_2,lance_atual,encerra_em,fotos,sinistro,extras";

interface LinhaVitrine {
  id: string;
  fonte: string;
  external_id: string;
  titulo: string;
  descricao: string | null;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  cidade: string | null;
  uf: string | null;
  tipo: TipoLeilao;
  lance_1: number | string | null;
  lance_2: number | string | null;
  lance_atual: number | string | null;
  encerra_em: string | null;
  fotos: string[] | null;
  sinistro: { tipo?: string } | null;
  extras: Record<string, unknown> | null;
}

export function supabaseConfigurado() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Lê todos os lotes ativos da view pública. Cliente sem sessão (chave publicável): a view só expõe o que
 * é público. Os filtros/facetas continuam em memória no repositório — com 10 mil lotes isso ainda cabe
 * numa resposta; quando passar disso, mover filtros para uma RPC.
 */
export async function carregarVitrine(): Promise<Leilao[]> {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const linhas: LinhaVitrine[] = [];
  const pagina = 1000;
  for (let de = 0; ; de += pagina) {
    const { data, error } = await sb
      .from("auctions_vitrine")
      .select(COLUNAS)
      .or(`encerra_em.is.null,encerra_em.gte.${new Date().toISOString()}`)
      .order("encerra_em", { ascending: true })
      .range(de, de + pagina - 1);
    if (error) throw new Error(`auctions_vitrine: ${error.message}`);
    linhas.push(...((data ?? []) as unknown as LinhaVitrine[]));
    if (!data || data.length < pagina) break;
  }
  const num = (v: number | string | null) => (v == null ? null : Number(v));
  return linhas.map((r) => {
    const x = r.extras ?? {};
    return {
      id: r.id,
      fonte: r.fonte,
      fonte_url: "", // nunca vem da view
      external_id: r.external_id,
      titulo: r.titulo,
      descricao: r.descricao ? r.descricao.slice(0, 400) : null,
      marca: r.marca,
      modelo: r.modelo,
      ano: r.ano,
      cidade: r.cidade,
      uf: r.uf,
      tipo: r.tipo,
      lance_1: num(r.lance_1),
      lance_2: num(r.lance_2),
      lance_atual: num(r.lance_atual),
      encerra_em: r.encerra_em,
      fotos: (r.fotos ?? []).slice(0, 1), // a vitrine mostra só a capa
      // Só o que a vitrine usa; o raw completo fica no banco.
      raw: {
        loja: x.loja ?? null,
        comitente: x.comitente ?? null,
        categoria: x.categoria ?? null,
        visitas: x.visitas ?? null,
        lances: x.lances ?? null,
        praca_1: x.praca_1 ?? null,
        praca_2: x.praca_2 ?? null,
        sinistro: r.sinistro?.tipo ?? (x.sinistro as string | undefined) ?? null,
      },
    };
  });
}
