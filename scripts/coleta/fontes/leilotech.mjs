// Plataforma white-label "Leilotech" (leilotech.com.br), Laravel + Pusher.
// Mesma estrutura em todos os tenants (window.__TENANT__): /agenda → /leilao/<id>/<slug> → /lote/<id>/<slug>.
// A página do lote é parcialmente SSR: título, descrição (JSON-LD Product), avaliação e status vêm no HTML.
// Exemplos validados: arrematabem.com.br, tesouroleiloes.com.br, magalhaesleiloes.leilao.br, toplance.com.br
import { buscarTexto, textoDoHtml, parseBRL, parseDataBR, normalizar, ehVeiculo, cidadeUf, decodificarEntidades } from "../lib.mjs";

export const nome = "leilotech";

export async function coletar({ base, limite = 50, log = () => {} }) {
  const host = new URL(base).host.replace(/^www\./, "");
  const agenda = await buscarTexto(`${base}/agenda`);
  const leiloes = [...new Set([...agenda.matchAll(/href="(\/leilao\/\d+\/[^"]+)"/g)].map((m) => m[1]))];
  log(`agenda: ${leiloes.length} leilões`);

  const resultado = [];
  for (const caminho of leiloes) {
    if (resultado.length >= limite) break;
    const html = await buscarTexto(base + caminho);
    const t = textoDoHtml(html);
    const data = t.match(/Data\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/)?.[1];
    const status = t.match(/Status\s+(\w+)/)?.[1];
    const modalidade = t.match(/Modalidade\s+(\w+)/)?.[1];
    const lotes = [...new Set([...html.matchAll(/href="(\/lote\/(\d+)\/[^"]+)"/g)].map((m) => [m[1], m[2]]))];

    for (const [loteCaminho, loteId] of lotes) {
      if (resultado.length >= limite) break;
      const loteHtml = await buscarTexto(base + loteCaminho);
      const ld = lerJsonLd(loteHtml);
      const lt = textoDoHtml(loteHtml);
      const titulo = (ld?.name ?? lt.match(/^(.{5,120}?) Esta página/)?.[1] ?? "").replace(/^.*? - /, "");
      const descricao = ld?.description ?? null;
      if (!ehVeiculo(`${titulo} ${descricao ?? ""} ${lt.slice(0, 600)}`)) continue;

      const avaliacao = parseBRL(lt.match(/Avaliação\s*R\$\s*([\d.,]+)/)?.[1]);
      const descLonga = lt.match(/Descrição\s+([\s\S]{20,3000}?)\s+Informações do leilão/)?.[1] ?? descricao;
      const { cidade, uf } = cidadeUf(descLonga ?? "");
      const fotos = [...new Set([...loteHtml.matchAll(/https:\/\/cdn\.leilotech\.workers\.dev\/[^"' )]+\/lote\/\d+\/fotos\/[^"' )]+/g)].map((m) => m[0]))];

      resultado.push(
        normalizar({
          fonte: `${nome}:${host}`,
          fonte_url: ld?.url ?? base + decodificarEntidades(loteCaminho),
          external_id: loteId,
          titulo,
          descricao: descLonga,
          cidade,
          uf,
          lance_1: avaliacao,
          encerra_em: parseDataBR(data),
          fotos,
          raw: { leilao: caminho, data_leilao: data, status_leilao: status, modalidade, status_lote: lt.match(/Status\s+(\w+)/)?.[1] ?? null },
        }),
      );
    }
    log(`${caminho}: ${lotes.length} lotes (veículos acumulados: ${resultado.length})`);
  }
  return resultado;
}

function lerJsonLd(html) {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(decodificarEntidades(m[1]));
  } catch {
    return null;
  }
}
