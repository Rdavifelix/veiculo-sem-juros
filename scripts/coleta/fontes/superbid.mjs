// Superbid Exchange (superbid.net) — maior marketplace extrajudicial do país (bancos, seguradoras,
// locadoras, DETRANs) e também "Canal Judicial". Expõe uma API JSON pública, a mesma que o site consome:
//   GET https://offer-query.superbid.net/offers/?portalId=[2,15]&locale=pt_BR&pageNumber=N&pageSize=100
//       &filter=product.productType.id:10;statusId:1
// productType 10 = Carros & Motos, 11 = Caminhões & Ônibus. statusId 1 = oferta aberta.
// Filtros se combinam com ";" (sem colchetes em campo numérico simples). Paginação 1-based.
// Não há filtro server-side por "encerramento futuro" (tentados: endDateTime, endDate, searchType…), e o índice guarda
// ofertas antigas/de teste com statusId 1. Então varremos as páginas e filtramos endDateTime >= agora no cliente.
// pageSize 100 às vezes devolve 503 (OpenSearch); 50 é estável. ~150 requisições para a varredura completa.
import { buscarJson, normalizar } from "../lib.mjs";

export const nome = "superbid";
const API = "https://offer-query.superbid.net/offers/";
const HEADERS = { origin: "https://www.superbid.net", referer: "https://www.superbid.net/" };

export async function coletar({ limite = 100, tipos = [10, 11], log = () => {} }) {
  const resultado = [];
  const vistos = new Set(); // a paginação não tem ordenação estável e repete ofertas entre páginas
  const agora = Date.now();
  for (const tipo of tipos) {
    const porPagina = 50;
    for (let pagina = 1; resultado.length < limite && pagina <= 400; pagina++) {
      const url = `${API}?portalId=%5B2,15%5D&locale=pt_BR&timeZoneId=America/Sao_Paulo&pageNumber=${pagina}&pageSize=${porPagina}&filter=product.productType.id:${tipo};statusId:1;auction.statusId:1`;
      let dados;
      try {
        dados = await buscarJson(url, { headers: HEADERS });
      } catch (e) {
        log(`tipo ${tipo} página ${pagina}: falhou (${e.message}), pulando`); // 503 intermitente do OpenSearch
        continue;
      }
      const ofertas = dados.offers ?? [];
      const ativas = ofertas.filter((o) => (o.endDateTime ?? 0) >= agora && !ehTeste(o));
      log(`tipo ${tipo} página ${pagina}: ${ofertas.length} ofertas, ${ativas.length} com encerramento futuro (índice: ${dados.total})`);
      for (const o of ativas) {
        if (resultado.length >= limite) break;
        if (vistos.has(o.id)) continue;
        vistos.add(o.id);
        resultado.push(mapear(o));
      }
      if (ofertas.length < porPagina) break;
    }
  }
  return resultado;
}

function mapear(o) {
  const p = o.product ?? {};
  const det = o.offerDetail ?? {};
  const loja = o.store?.name ?? o.manager?.name ?? null;
  const loc = p.location ?? {};
  const end = o.auction?.address ?? {};
  // "Campinas - SP" → cidade/uf; cai no endereço do leilão se o produto não tiver localização.
  const [cidadeLoc, ufLoc] = (loc.city ?? "").split(/\s*-\s*/);
  const judicial = Boolean(p.judicial?.processNumber) || /judicial/i.test(`${o.auction?.desc ?? ""} ${o.auction?.judicialPracaDescription ?? ""}`);
  return normalizar({
    fonte: nome,
    fonte_url: `https://www.superbid.net/oferta/${slug(p.shortDesc)}-${o.id}`,
    external_id: o.id,
    titulo: p.shortDesc ?? "",
    descricao: p.detailedDescription ?? o.offerDescription?.offerDescription ?? null,
    marca: p.brand?.description ?? p.brand?.desc ?? undefined,
    modelo: p.model?.description ?? p.model?.desc ?? undefined,
    ano: p.yearModel ?? p.modelYear ?? undefined,
    cidade: (cidadeLoc || end.city || null)?.toUpperCase() ?? null,
    uf: ufLoc || end.stateCode || null,
    tipo: judicial ? "judicial" : "extrajudicial",
    lance_1: det.initialBidValue ?? o.price ?? null,
    lance_atual: o.hasBids ? det.currentMaxBid ?? null : null,
    encerra_em: o.endDateTime ? new Date(o.endDateTime).toISOString() : null,
    fotos: extrairFotos(p),
    raw: {
      loja,
      leiloeiro: o.auction?.auctioneer ?? null,
      pagina_leilao: o.auction?.id ? `https://www.superbid.net/leilao/${o.auction.id}` : null,
      // Anexos do lote (pareceres de avaliação, laudos). O edital fica na página do leilão.
      documentos: (p.attachments ?? [])
        .filter((a) => a?.link && /pdf/i.test(a.contentType ?? a.link))
        .map((a) => ({ nome: limparNome(a.originalFileName) || "Documento", url: a.link, tipo: "pdf" })),
      auction_id: o.auction?.id,
      auction: o.auction?.desc,
      praca: o.auction?.judicialPracaDescription ?? null,
      processo: p.judicial?.processNumber ?? null,
      categoria: p.subCategory?.category?.description ?? null,
      subcategoria: p.subCategory?.description ?? null,
      // Condições comerciais: entrada mínima (%) e parcelas — o que define "sem juros" para nós.
      entrada_min_pct: o.commercialCondition?.minAdvanceRate ?? null,
      max_parcelas: o.commercialCondition?.maxInstallments ?? null,
      lances: o.totalBids ?? 0,
      visitas: o.visits ?? 0,
      product: p,
    },
  });
}

// O índice público inclui ofertas de homologação (loja demo, "Teste automação…"); não são leilões reais.
function ehTeste(o) {
  const loja = `${o.store?.name ?? ""} ${o.manager?.name ?? ""} ${o.auction?.desc ?? ""}`;
  return /demo|teste|homolog|nws tecnologia/i.test(loja) || /^teste\b/i.test(o.product?.shortDesc ?? "");
}

// Nomes de arquivo do Superbid vêm com acentos mal codificados (UTF-8 lido como Latin-1).
function limparNome(nome) {
  if (!nome) return null;
  let n = String(nome);
  try {
    n = decodeURIComponent(escape(n));
  } catch {
    /* mantém como veio */
  }
  return n.replace(/\.pdf$/i, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function slug(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extrairFotos(obj) {
  const urls = new Set();
  const visitar = (x) => {
    if (typeof x === "string") {
      if (/^https?:\/\/.+\.(jpe?g|png|webp)(\?|$)/i.test(x)) urls.add(x);
    } else if (Array.isArray(x)) x.forEach(visitar);
    else if (x && typeof x === "object") Object.values(x).forEach(visitar);
  };
  visitar(obj);
  return [...urls];
}
