// Utilitários compartilhados pelos coletores. Sem dependências externas.

// UA de navegador comum: WAFs (Cloudflare nos sites Leilotech) devolvem 403 para UAs "bot" vindos de IPs de
// datacenter, como os runners do GitHub. Continuamos identificáveis pelo cabeçalho `From` e pelo ritmo de 1 req/s.
export const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const CABECALHOS_PADRAO = {
  "user-agent": UA,
  accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "accept-language": "pt-BR,pt;q=0.9,en;q=0.5",
  from: "contato@veiculosemjuros.com.br",
};

const ultimaRequisicaoPorHost = new Map();

/** Espera `ms` milissegundos. */
export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch educado: 1 requisição por host a cada `intervaloMs`, UA identificável,
 * timeout e até 5 tentativas com espera exponencial em erro de rede/5xx.
 */
export async function buscar(url, { intervaloMs = 1000, headers = {}, method = "GET", body } = {}) {
  const host = new URL(url).host;
  const ultima = ultimaRequisicaoPorHost.get(host) ?? 0;
  const espera = ultima + intervaloMs - Date.now();
  if (espera > 0) await dormir(espera);
  ultimaRequisicaoPorHost.set(host, Date.now());

  let erro;
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      const res = await fetch(url, {
        method,
        body,
        headers: { ...CABECALHOS_PADRAO, ...headers },
        signal: AbortSignal.timeout(30_000),
        redirect: "follow",
      });
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      erro = e;
      await dormir(2000 * 2 ** tentativa); // 2s, 4s, 8s, 16s
    }
  }
  throw erro;
}

export async function buscarTexto(url, opts) {
  const res = await buscar(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res.text();
}

export async function buscarJson(url, opts) {
  const res = await buscar(url, { ...opts, headers: { accept: "application/json", ...(opts?.headers ?? {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res.json();
}

/** Remove scripts/estilos/tags e normaliza espaços. */
export function textoDoHtml(html) {
  return decodificarEntidades(
    html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export function decodificarEntidades(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

/** "R$ 82.271,00" → 82271. Retorna null se não houver número. */
export function parseBRL(s) {
  if (s == null) return null;
  const limpo = String(s).replace(/R\$|\s/g, "");
  if (/^\d+\.\d{1,2}$/.test(limpo)) return Number(limpo); // formato "80000.00" (Leilotech)
  const m = String(s).replace(/\s/g, "").match(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?/);
  if (!m) return null;
  return Number(m[1].replace(/\./g, "") + "." + (m[2] ?? "0"));
}

/** "26/10/2026 15:30" → ISO em horário de Brasília (-03:00). Sem hora assume 23:59. */
export function parseDataBR(s) {
  if (!s) return null;
  const iso = String(s).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); // "2026-03-24 10:56:15" (Sodré)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}T${iso[4]}:${iso[5]}:00-03:00`;
  const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})(?:\D{0,20}?(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, d, mo, y, h = "23", mi = "59"] = m;
  return `${y}-${mo}-${d}T${h}:${mi}:00-03:00`;
}

/** Decide judicial / extrajudicial / nd a partir do texto. */
export function inferirTipo(texto) {
  const t = (texto ?? "").toLowerCase();
  if (/extrajudicial|alienação fiduciária|alienacao fiduciaria|seguradora|sinistr|financeira|recuperad/.test(t))
    return "extrajudicial";
  if (/judicial|processo|vara |exequente|executado|comarca|juízo|juizo|penhora|carta de arrematação/.test(t))
    return "judicial";
  return "nd";
}

const MARCAS = [
  "chevrolet", "gm", "fiat", "volkswagen", "vw", "ford", "toyota", "honda", "hyundai", "renault", "nissan",
  "jeep", "peugeot", "citroen", "citroën", "kia", "mitsubishi", "bmw", "mercedes", "mercedes-benz", "audi",
  "volvo", "land rover", "porsche", "yamaha", "suzuki", "kawasaki", "dafra", "shineray", "haojue", "scania",
  "iveco", "man", "daf", "jac", "chery", "caoa", "byd", "gwm", "ram", "dodge", "chrysler", "subaru", "lifan",
  "troller", "agrale", "marcopolo", "mini", "ducati", "harley", "harley-davidson", "triumph", "bajaj", "royal enfield",
];

/** Tenta separar marca/modelo de um título de lote. Heurística simples para a base semente. */
export function marcaModelo(titulo) {
  const t = (titulo ?? "")
    .replace(/^(ve[ií]culo|automóvel|automovel|motocicleta|moto|caminh[aã]o|lote \d+)[\s:,-]*/i, "")
    .replace(/\b(marca|modelo)\b[:/]?\s*/gi, "")
    .trim();
  const lower = t.toLowerCase();
  const marca = MARCAS.find((m) => lower.startsWith(m + " ") || lower.startsWith(m + "/"));
  if (!marca) {
    const [primeira, ...resto] = t.split(/[\s/]+/);
    return { marca: primeira ? capitalizar(primeira) : null, modelo: resto.join(" ") || null };
  }
  return { marca: capitalizar(marca), modelo: t.slice(marca.length).replace(/^[\s/]+/, "") || null };
}

export function inferirAno(texto) {
  const m = (texto ?? "").match(/\b(?:ano(?:\/modelo)?\D{0,6})?((?:19|20)\d{2})(?:\s*\/\s*((?:19|20)?\d{2}))?\b/i);
  return m ? Number(m[1]) : null;
}

export function ehVeiculo(texto) {
  return /ve[ií]culo|automóvel|automovel|motocicleta|\bmoto\b|caminh[aã]o|caminhonete|camioneta|\bsuv\b|\bplaca\b|chassi|renavam|ônibus|onibus|\bvan\b|utilit[aá]rio/i.test(
    texto ?? "",
  );
}

/** "Casimiro de Abreu/RJ" → { cidade, uf }. */
export function cidadeUf(texto) {
  const m = (texto ?? "").match(/([A-ZÁ-Ú][\p{L}' .-]{2,40}?)\s*[/-]\s*([A-Z]{2})\b(?![\p{L}])/u);
  if (!m) return { cidade: null, uf: null };
  // "Loja - Pessoinha - Casimiro de Abreu/RJ" → fica só o último segmento, que é a cidade.
  const cidade = m[1].split(/\s+-\s+|,\s*/).pop().trim().toUpperCase();
  return { cidade, uf: m[2] };
}

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Registro normalizado — espelha a tabela `auctions` de docs/MODELO.md.
 * @typedef {object} Leilao
 * @property {string} fonte           ex.: "suporteleiloes:depaulaonline.com.br"
 * @property {string} fonte_url       link do lote no site do leiloeiro (só liberado via desbloqueio)
 * @property {string} external_id     id estável no site de origem
 * @property {string} titulo
 * @property {string|null} descricao
 * @property {string|null} marca
 * @property {string|null} modelo
 * @property {number|null} ano
 * @property {string|null} cidade
 * @property {string|null} uf
 * @property {"judicial"|"extrajudicial"|"nd"} tipo
 * @property {number|null} lance_1    valor 1ª praça / lance inicial
 * @property {number|null} lance_2    valor 2ª praça
 * @property {number|null} lance_atual
 * @property {string|null} encerra_em ISO 8601
 * @property {string[]} fotos
 * @property {object} raw             dados brutos da fonte para reprocessar sem recoletar
 */
export function normalizar(parcial) {
  const mm = marcaModelo(parcial.titulo);
  return {
    fonte: parcial.fonte,
    fonte_url: parcial.fonte_url,
    external_id: String(parcial.external_id),
    titulo: parcial.titulo?.trim() ?? "",
    descricao: parcial.descricao ?? null,
    marca: parcial.marca ?? mm.marca,
    modelo: parcial.modelo ?? mm.modelo,
    ano: parcial.ano ?? inferirAno(`${parcial.titulo ?? ""} ${parcial.descricao ?? ""}`),
    cidade: parcial.cidade ?? null,
    uf: parcial.uf ?? null,
    tipo: parcial.tipo ?? inferirTipo(`${parcial.titulo ?? ""} ${parcial.descricao ?? ""}`),
    lance_1: parcial.lance_1 ?? null,
    lance_2: parcial.lance_2 ?? null,
    lance_atual: parcial.lance_atual ?? null,
    encerra_em: parcial.encerra_em ?? null,
    fotos: parcial.fotos ?? [],
    raw: parcial.raw ?? {},
  };
}
