import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Tabela FIPE via API pública (parallelum.com.br, sem chave). O casamento marca/modelo/ano é por
 * similaridade de texto, então o resultado traz o nome exato do modelo FIPE para o usuário conferir.
 * Cache de 30 dias no banco (RPC fipe_cache_*) + memória do processo.
 */
const API = "https://parallelum.com.br/fipe/api/v2/cars";

export interface Fipe {
  codigo: string;
  marca: string;
  modelo: string;
  ano: string;
  combustivel: string;
  valor: number;
  referencia: string;
  /** 0–1: quão bem o modelo FIPE casa com o título do lote. */
  confianca: number;
  nao_encontrado?: false;
}
export type ResultadoFipe = Fipe | { nao_encontrado: true };

const memoria = new Map<string, { em: number; valor: ResultadoFipe }>();
let marcasCache: { em: number; lista: { code: string; name: string }[] } | null = null;

const SINONIMOS: Record<string, string> = {
  vw: "volkswagen", volks: "volkswagen", gm: "chevrolet", "mercedes-benz": "mercedes", mercedes: "mercedes", "m.benz": "mercedes", mb: "mercedes",
  "land rover": "land rover", caoa: "chery", "i/m.benz": "mercedes", "i/vw": "volkswagen",
};

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { accept: "application/json" }, next: { revalidate: 86400 } });
  if (!r.ok) throw new Error(`FIPE ${r.status}`);
  return r.json() as Promise<T>;
}

async function marcas() {
  if (marcasCache && Date.now() - marcasCache.em < 86_400_000) return marcasCache.lista;
  const lista = await json<{ code: string; name: string }[]>(`${API}/brands`);
  marcasCache = { em: Date.now(), lista };
  return lista;
}

/** Pontua quantos tokens do título aparecem no nome do modelo FIPE (e vice-versa). */
function similaridade(titulo: string, modeloFipe: string) {
  const a = new Set(normalizar(titulo).split(" ").filter((t) => t.length > 1));
  const b = normalizar(modeloFipe).split(" ").filter((t) => t.length > 1);
  if (!b.length) return 0;
  let acertos = 0;
  for (const t of b) if (a.has(t) || [...a].some((x) => x.startsWith(t) || t.startsWith(x))) acertos++;
  return acertos / b.length;
}

/** Quando o coletor não separou a marca ("VEÍCULO (AUTOMOTOR) MARCA LAND ROVER..."), procura uma marca FIPE no título. */
async function marcaDoTitulo(titulo: string): Promise<string | null> {
  const t = ` ${normalizar(titulo)} `;
  const lista = await marcas();
  const achada = lista
    .map((b) => normalizar(b.name).replace(/^(gm|vw)\s*-\s*/, "")) // "GM - Chevrolet" → "chevrolet"
    .filter((n) => n.length > 2)
    .sort((a, b) => b.length - a.length)
    .find((n) => t.includes(` ${n} `));
  return achada ?? null;
}

export async function consultarFipe(marca: string | null, titulo: string, ano: number | null): Promise<ResultadoFipe | null> {
  if (!ano) return null;
  if (!marca) {
    try {
      marca = await marcaDoTitulo(titulo);
    } catch {
      return null;
    }
    if (!marca) return { nao_encontrado: true };
  }
  const chave = `${normalizar(marca)}|${normalizar(titulo).slice(0, 60)}|${ano}`;
  const mem = memoria.get(chave);
  if (mem && Date.now() - mem.em < 3_600_000) return mem.valor;

  const supabase = await createClient();
  const { data: cacheado } = await supabase.rpc("fipe_cache_ler", { p_chave: chave });
  if (cacheado) {
    memoria.set(chave, { em: Date.now(), valor: cacheado as ResultadoFipe });
    return cacheado as ResultadoFipe;
  }

  let resultado: ResultadoFipe = { nao_encontrado: true };
  try {
    const marcaNorm = SINONIMOS[normalizar(marca)] ?? normalizar(marca);
    const lista = await marcas();
    const m = lista.find((b) => normalizar(b.name).includes(marcaNorm)) ?? lista.find((b) => marcaNorm.includes(normalizar(b.name).split(" ")[0]));
    if (m) {
      const modelos = await json<{ code: string; name: string }[]>(`${API}/brands/${m.code}/models`);
      const ranqueados = modelos
        .map((x) => ({ ...x, s: similaridade(titulo, x.name) }))
        .filter((x) => x.s >= 0.5)
        .sort((a, b) => b.s - a.s)
        .slice(0, 4);
      for (const cand of ranqueados) {
        const anos = await json<{ code: string; name: string }[]>(`${API}/brands/${m.code}/models/${cand.code}/years`);
        const y = anos.find((a) => a.name.startsWith(String(ano))) ?? anos.find((a) => a.name.startsWith(String(ano + 1))) ?? anos.find((a) => a.name.startsWith(String(ano - 1)));
        if (!y) continue;
        const preco = await json<{ price: string; brand: string; model: string; modelYear: number; fuel: string; codeFipe: string; referenceMonth: string }>(
          `${API}/brands/${m.code}/models/${cand.code}/years/${y.code}`,
        );
        const valor = Number(preco.price.replace(/[^\d,]/g, "").replace(",", "."));
        if (valor > 0) {
          resultado = { codigo: preco.codeFipe, marca: preco.brand, modelo: preco.model, ano: y.name, combustivel: preco.fuel, valor, referencia: preco.referenceMonth, confianca: Math.round(cand.s * 100) / 100 };
          break;
        }
      }
    }
  } catch (e) {
    console.error("[fipe]", (e as Error).message);
    return null; // falha de rede: não cacheia
  }
  memoria.set(chave, { em: Date.now(), valor: resultado });
  await supabase.rpc("fipe_cache_gravar", { p_chave: chave, p_resultado: resultado }).then(() => undefined, () => undefined);
  return resultado;
}
