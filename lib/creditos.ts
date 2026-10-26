import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Filtros } from "@/lib/leiloes/tipos";

export interface Carteira {
  saldo: number;
  cotaUsadas: number;
  cotaLimite: number;
}

/** Saldo e cota do usuário logado (RPCs seguras: só enxergam auth.uid()). */
export async function carteira(): Promise<Carteira> {
  const supabase = await createClient();
  const [saldo, cota] = await Promise.all([supabase.rpc("saldo_creditos"), supabase.rpc("cota_buscas")]);
  const linha = Array.isArray(cota.data) ? cota.data[0] : cota.data;
  return {
    saldo: (saldo.data as number | null) ?? 0,
    cotaUsadas: (linha as { usadas?: number } | null)?.usadas ?? 0,
    cotaLimite: (linha as { limite?: number } | null)?.limite ?? 20,
  };
}

/** Só os filtros que definem a busca (ordem e página não contam: paginar a mesma busca é grátis). */
export function filtrosDaBusca(f: Filtros) {
  const { q, tipo, categoria, uf, marca, preco, encerra } = f;
  const limpo: Record<string, string> = {};
  for (const [k, v] of Object.entries({ q, tipo, categoria, uf, marca, preco, encerra })) if (v) limpo[k] = String(v);
  return limpo;
}

type ResultadoBusca = { erro: "sem_creditos" } | { search_id: string; custou: boolean; saldo: number };

export async function registrarBusca(filtros: Record<string, string>, total: number): Promise<ResultadoBusca> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_busca", { p_filtros: filtros, p_total: total });
  if (error) {
    if (error.message.includes("sem créditos")) return { erro: "sem_creditos" as const };
    throw new Error(`registrar_busca: ${error.message}`);
  }
  const linha = (Array.isArray(data) ? data[0] : data) as { search_id: string; custou: boolean; saldo: number };
  return { search_id: linha.search_id, custou: linha.custou, saldo: linha.saldo };
}

/** Busca já paga pelo usuário? Devolve os filtros gravados para conferir que são os mesmos. */
export async function buscaPaga(searchId: string): Promise<Record<string, string> | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("searches").select("filtros").eq("id", searchId).maybeSingle();
  return (data?.filtros as Record<string, string> | undefined) ?? null;
}

export async function idsDesbloqueados(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("unlocks").select("auction_id");
  return new Set((data ?? []).map((r) => r.auction_id as string));
}

type ResultadoDesbloqueio = { erro: "sem_creditos" | "nao_encontrado" } | { url: string };

export async function desbloquear(auctionId: string): Promise<ResultadoDesbloqueio> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("desbloquear_leilao", { p_auction: auctionId });
  if (error) {
    if (error.message.includes("sem créditos")) return { erro: "sem_creditos" as const };
    if (error.message.includes("não encontrado")) return { erro: "nao_encontrado" as const };
    throw new Error(`desbloquear_leilao: ${error.message}`);
  }
  return { url: String(data) };
}
