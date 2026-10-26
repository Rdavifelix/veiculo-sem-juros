import "server-only";
import { createClient } from "@/lib/supabase/server";
import { buscarPorId } from "@/lib/leiloes/repositorio";
import type { LeilaoVitrine } from "@/lib/leiloes/tipos";

export interface Participacao {
  auction_id: string;
  lance_maximo: number | null;
  observacao: string | null;
  criado_em: string;
}

export interface ParticipacaoComLeilao extends Participacao {
  leilao: LeilaoVitrine | null;
}

/** Leilões que o usuário marcou "vou participar", com o lote (se ainda estiver ativo na vitrine). */
export async function listarParticipacoes(): Promise<ParticipacaoComLeilao[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("participacoes").select("auction_id, lance_maximo, observacao, criado_em").order("criado_em", { ascending: false });
  const linhas = (data ?? []) as Participacao[];
  return Promise.all(linhas.map(async (p) => ({ ...p, lance_maximo: p.lance_maximo == null ? null : Number(p.lance_maximo), leilao: await buscarPorId(p.auction_id) })));
}

export async function participacaoDe(auctionId: string): Promise<Participacao | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("participacoes").select("auction_id, lance_maximo, observacao, criado_em").eq("auction_id", auctionId).maybeSingle();
  if (!data) return null;
  const p = data as Participacao;
  return { ...p, lance_maximo: p.lance_maximo == null ? null : Number(p.lance_maximo) };
}

/** Marca (ou atualiza) a intenção de participar. A policy exige que o lote esteja desbloqueado pelo usuário. */
export async function marcarParticipacao(auctionId: string, lanceMaximo: number | null, observacao: string | null): Promise<{ ok: true } | { erro: string }> {
  const supabase = await createClient();
  const { data: sessao } = await supabase.auth.getUser();
  if (!sessao.user) return { erro: "sem_sessao" };
  const { error } = await supabase
    .from("participacoes")
    .upsert({ user_id: sessao.user.id, auction_id: auctionId, lance_maximo: lanceMaximo, observacao }, { onConflict: "user_id,auction_id" });
  if (error) return { erro: /row-level security/i.test(error.message) ? "sem_desbloqueio" : error.message };
  return { ok: true };
}

export async function desmarcarParticipacao(auctionId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("participacoes").delete().eq("auction_id", auctionId);
}
