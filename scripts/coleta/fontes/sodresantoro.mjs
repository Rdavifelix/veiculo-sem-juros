// Sodré Santoro — maior leiloeiro de veículos de bancos/seguradoras de SP. Site Nuxt protegido por
// WAF (curl recebe 403), mas o próprio front chama POST /api/search-lots com um corpo estilo
// Elasticsearch. Usamos o Chromium do Playwright só para passar pelo WAF e reaproveitar os cookies.
// Requer `playwright` instalado (npm i -D playwright && npx playwright install chromium).
import { createRequire } from "node:module";
import { normalizar, parseDataBR } from "../lib.mjs";

export const nome = "sodresantoro";
const BASE = "https://www.sodresantoro.com.br";

export async function coletar({ limite = 96, log = () => {} }) {
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({
      locale: "pt-BR",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
    });
    const page = await ctx.newPage();
    // Carrega uma página real: o WAF só libera /api/* para o fetch feito de dentro do navegador.
    await page.goto(`${BASE}/veiculos/lotes`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3000);

    const resultado = [];
    const tamanho = 48;
    for (let from = 0; resultado.length < limite; from += tamanho) {
      const { status, dados } = await page.evaluate(async (body) => {
        const r = await fetch("/api/search-lots", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(body),
        });
        return { status: r.status, dados: r.ok ? await r.json() : null };
      }, corpo(from, Math.min(tamanho, limite - resultado.length)));
      if (status !== 200) throw new Error(`HTTP ${status} em /api/search-lots`);
      const lotes = dados.results ?? dados.hits?.hits?.map((h) => h._source) ?? [];
      log(`from=${from}: ${lotes.length} lotes (total ${dados.total ?? "?"})`);
      if (!lotes.length) break;
      for (const l of lotes) resultado.push(mapear(l));
      await page.waitForTimeout(1000);
    }
    return resultado;
  } finally {
    await browser.close();
  }
}

function corpo(from, size) {
  return {
    indices: ["veiculos", "judiciais-veiculos"],
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: [
                { bool: { must: [{ term: { auction_status: "online" } }] } },
                { bool: { must: [{ term: { auction_status: "aberto" } }], must_not: [{ terms: { lot_status_id: [5, 7, 9] } }] } },
              ],
              minimum_should_match: 1,
            },
          },
          { bool: { must_not: [{ term: { lot_test: true } }, { terms: { lot_status_id: [9] } }] } }, // 9 = retirado
          { range: { lot_date_end: { gte: "now-3h" } } }, // o índice mantém lotes "em andamento" com data passada
        ],
      },
    },
    from,
    size,
    sort: [{ lot_date_end: { order: "asc" } }],
  };
}

// Campos observados no índice (ver raw de uma coleta): lot_title, lot_brand, lot_model, lot_year_model, lot_km,
// lot_location ("guarulhos i/sp"), lot_pictures[], bid_initial, bid_actual, bid_has_bid, lot_date_end, auction_date_init,
// lot_is_judicial, lot_sinister, lot_financeable, client_name (comitente), lot_plate ("final 8"), lot_status.
function mapear(l) {
  const [cidade, uf] = String(l.lot_location ?? "").split("/");
  const lanceInicial = Number(l.bid_initial) || null;
  const lanceAtual = l.bid_has_bid ? Number(l.bid_actual) || null : null;
  const fotos = (l.lot_pictures ?? []).map((f) => (typeof f === "string" ? f : f?.url ?? f?.src)).filter((u) => /^https?:/.test(u ?? ""));
  return normalizar({
    fonte: nome,
    fonte_url: `${BASE}/leilao/${l.auction_id}/lote/${l.id}/`,
    external_id: l.id,
    titulo: (l.lot_title ?? `${l.lot_brand ?? ""} ${l.lot_model ?? ""}`).trim(),
    descricao: l.lot_description?.trim() || null,
    marca: l.lot_brand ?? undefined,
    modelo: l.lot_model ?? undefined,
    ano: l.lot_year_model ?? l.lot_year_manufacture ?? undefined,
    cidade: cidade?.trim().toUpperCase() || null,
    uf: uf?.trim().toUpperCase() || null,
    tipo: l.lot_is_judicial ? "judicial" : "extrajudicial",
    lance_1: lanceInicial,
    lance_atual: lanceAtual,
    encerra_em: parseDataBR(l.lot_date_end ?? l.auction_date_end ?? l.auction_date_init),
    fotos,
    raw: {
      comitente: l.client_name ?? null,
      leilao: l.auction_name ?? null,
      auction_id: l.auction_id,
      status_lote: l.lot_status ?? null,
      sinistro: l.lot_sinister ?? null,
      financiavel: l.lot_financeable ?? null,
      km: l.lot_km ?? null,
      placa: l.lot_plate ?? null,
      combustivel: l.lot_fuel ?? null,
      cor: l.lot_color ?? null,
      categoria: l.lot_category ?? null,
      sucata: l.lot_is_scrap ?? null,
      visitas: l.lot_visits ?? null,
    },
  });
}
