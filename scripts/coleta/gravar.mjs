// Grava lotes coletados no Supabase com a chave de serviço (bypass de RLS — só roda no job, nunca no site).
// Regras: upsert por (fonte, external_id); lotes da mesma fonte que não vieram na coleta viram "removido";
// lotes com encerra_em no passado viram "encerrado". Uma coleta vazia NÃO remove nada (pode ser falha do site).
import { createClient } from "@supabase/supabase-js";

export function clienteServico() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (só no job, nunca no repositório).");
  return createClient(url, chave, { auth: { persistSession: false } });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {string} fonteId        ex.: "superbid" ou "suporteleiloes:depaulaonline.com.br"
 * @param {object[]} leiloes      registros normalizados (lib.mjs → normalizar)
 * @param {{ plataforma: string, base_url?: string|null, erro?: string|null }} meta
 */
export async function gravarFonte(sb, fonteId, leiloes, meta) {
  const agora = new Date().toISOString();
  const { error: eFonte } = await sb.from("fontes").upsert(
    { id: fonteId, plataforma: meta.plataforma, base_url: meta.base_url ?? null, ultima_coleta: agora, ultimo_erro: meta.erro ?? null },
    { onConflict: "id" },
  );
  if (eFonte) throw new Error(`fontes: ${eFonte.message}`);
  if (!leiloes.length) return { gravados: 0, removidos: 0 };

  const linhas = leiloes.map((l) => ({
    fonte: fonteId,
    external_id: String(l.external_id),
    fonte_url: l.fonte_url,
    titulo: l.titulo || "(sem título)",
    descricao: l.descricao ?? null,
    marca: l.marca ?? null,
    modelo: l.modelo ?? null,
    ano: l.ano ?? null,
    cidade: l.cidade ?? null,
    uf: l.uf ? String(l.uf).slice(0, 2).toUpperCase() : null,
    tipo: l.tipo ?? "nd",
    lance_1: l.lance_1 ?? null,
    lance_2: l.lance_2 ?? null,
    lance_atual: l.lance_atual ?? null,
    encerra_em: l.encerra_em ?? null,
    fotos: (l.fotos ?? []).slice(0, 12),
    sinistro: l.raw?.sinistro ? { tipo: l.raw.sinistro } : null,
    status: "ativo",
    raw: podarRaw(l.raw ?? {}),
    coletado_em: agora,
  }));

  let gravados = 0;
  for (let i = 0; i < linhas.length; i += 200) {
    const lote = linhas.slice(i, i + 200);
    const { error } = await sb.from("auctions").upsert(lote, { onConflict: "fonte,external_id" });
    if (error) throw new Error(`auctions upsert (${fonteId}, bloco ${i / 200 + 1}): ${error.message}`);
    gravados += lote.length;
  }

  // Sumiu do site do leiloeiro → removido (o modelo mostra "LEILÃO REMOVIDO" em Desbloqueados).
  const ids = new Set(linhas.map((r) => r.external_id));
  const { data: existentes, error: eSel } = await sb.from("auctions").select("id, external_id").eq("fonte", fonteId).eq("status", "ativo");
  if (eSel) throw new Error(`auctions select (${fonteId}): ${eSel.message}`);
  const sumiram = (existentes ?? []).filter((r) => !ids.has(r.external_id)).map((r) => r.id);
  let removidos = 0;
  for (let i = 0; i < sumiram.length; i += 500) {
    const { error } = await sb.from("auctions").update({ status: "removido" }).in("id", sumiram.slice(i, i + 500));
    if (error) throw new Error(`auctions removidos (${fonteId}): ${error.message}`);
    removidos += Math.min(500, sumiram.length - i);
  }
  return { gravados, removidos };
}

/** Lotes cujo prazo passou saem da vitrine como "encerrado" (independente da fonte). */
export async function encerrarVencidos(sb) {
  const { data, error } = await sb
    .from("auctions")
    .update({ status: "encerrado" })
    .eq("status", "ativo")
    .lt("encerra_em", new Date().toISOString())
    .select("id");
  if (error) throw new Error(`auctions encerrados: ${error.message}`);
  return data?.length ?? 0;
}

/** Mantém o raw útil e pequeno: fora o objeto `product` inteiro do Superbid e o HTML do card. */
function podarRaw(raw) {
  const r = { ...raw };
  delete r.product;
  delete r.card;
  return r;
}
