// Plataforma white-label "Suporte Leilões" (suporteleiloes.com.br), versão clássica (Symfony).
// Centenas de leiloeiros rodam nela com a mesma estrutura: /busca?tipo=Veiculos (cards SSR)
// e /oferta/leilao/<cat>/<sub>/<lote>/id-<bem>/<slug> (detalhe com praças, processo, descrição).
// Exemplo validado: https://www.depaulaonline.com.br
import { buscarTexto, textoDoHtml, parseBRL, parseDataBR, normalizar, cidadeUf, decodificarEntidades } from "../lib.mjs";

export const nome = "suporteleiloes";

export async function coletar({ base, limite = 50, detalhes = true, log = () => {} }) {
  const host = new URL(base).host.replace(/^www\./, "");
  const vistos = new Set();
  const resultado = [];

  for (let pagina = 1; pagina <= 50 && resultado.length < limite; pagina++) {
    const url = `${base}/busca?tipo=Veiculos&pagina=${pagina}`;
    const html = await buscarTexto(url);
    const cards = html.split(/<div id="lote(\d+)" class="lote">/).slice(1);
    let novos = 0;
    for (let i = 0; i < cards.length && resultado.length < limite; i += 2) {
      const loteId = cards[i];
      const card = cards[i + 1];
      if (vistos.has(loteId)) continue;
      vistos.add(loteId);
      novos++;

      const href = card.match(/href="(\/oferta\/[^"]+?)"/)?.[1];
      if (!href) continue;
      const fonte_url = base + decodificarEntidades(href).replace(/#.*$/, "");
      const titulo = textoDoHtml(card.match(/<h3>([\s\S]*?)<\/h3>/)?.[1] ?? "");
      const foto = card.match(/background-image:\s*url\(([^)]+)\)/)?.[1]?.replace(/['"]/g, "");
      const texto = textoDoHtml(card);
      const lance_1 = parseBRL(texto.match(/Valor 1º leilão:\s*(R\$\s*[\d.,]+)/)?.[1]);
      const lance_2 = parseBRL(texto.match(/Valor 2º leilão:\s*(R\$\s*[\d.,]+)/)?.[1]);
      const lance_atual = parseBRL(texto.match(/Lance atual:?\s*(R\$\s*[\d.,]+)/)?.[1]);

      const parcial = {
        fonte: `${nome}:${host}`,
        fonte_url,
        external_id: loteId,
        titulo,
        lance_1,
        lance_2,
        lance_atual,
        fotos: foto ? [foto] : [],
        raw: { card: texto },
      };

      if (detalhes) {
        try {
          Object.assign(parcial, await lerDetalhe(fonte_url));
        } catch (e) {
          log(`  detalhe falhou ${fonte_url}: ${e.message}`);
        }
      }
      resultado.push(normalizar(parcial));
    }
    log(`página ${pagina}: ${novos} cards novos (total ${resultado.length})`);
    if (novos === 0) break; // a plataforma repete a 1ª página quando acaba
  }
  return resultado;
}

async function lerDetalhe(url) {
  const html = await buscarTexto(url);
  const t = textoDoHtml(html);
  const primeiro = t.match(/Primeiro leilão\s+(\d{2}\/\d{2}\/\d{4})(?:\s+a partir das\s+(\d{2}:\d{2}))?/i);
  const segundo = t.match(/Segundo leilão\s+(\d{2}\/\d{2}\/\d{4})(?:\s+a partir das\s+(\d{2}:\d{2}))?/i);
  // Na ficha, a próxima data aparece logo antes do rótulo: "Valor 1º leilão 09/11/2026 16:00 Data do leilão*".
  const proxima = t.match(/(\d{2}\/\d{2}\/\d{4}(?:\s*\d{2}:\d{2})?)\s*Data do leilão/i)?.[1];
  const encerra = segundo ?? primeiro;
  const processo = t.match(/Processo:\s*([\d.\-/]+)?\s*Autor:\s*(.+?)\s*Executado:\s*(.+?)\s*Descrição/i);
  const descricao = t.match(/Descrição\s+(?:Normal 0 21 false false false PT-BR X-NONE X-NONE\s+)?([\s\S]{20,2500}?)(?:\s+Exibir mais|\s+Formas de pagamento|\s+Documentos)/i)?.[1]?.trim() ?? null;
  const avaliacao = parseBRL(t.match(/Avaliação\s*(R\$\s*[\d.,]+)/i)?.[1]);
  const { cidade, uf } = cidadeUf(descricao ?? "");
  const fotos = [...new Set([...html.matchAll(/https:\/\/static\.suporteleiloes\.com\.br\/[^"' )]+\/bens\/[^"' )]+\.(?:jpe?g|png|webp)/gi)].map((m) => m[0]))];
  return {
    descricao,
    cidade,
    uf,
    encerra_em: parseDataBR(proxima) ?? (encerra ? parseDataBR(`${encerra[1]} ${encerra[2] ?? ""}`) : null),
    tipo: processo ? "judicial" : undefined,
    fotos: fotos.length ? fotos : undefined,
    raw: {
      processo: processo?.[1] ?? null,
      autor: processo?.[2] ?? null,
      executado: processo?.[3] ?? null,
      avaliacao,
      praca_1: primeiro ? parseDataBR(`${primeiro[1]} ${primeiro[2] ?? ""}`) : null,
      praca_2: segundo ? parseDataBR(`${segundo[1]} ${segundo[2] ?? ""}`) : null,
    },
  };
}
