import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { consultarFipe } from "@/lib/fipe";

/**
 * Análise Premium de um lote: a IA lê a ficha, o edital e os documentos (PDF), pesquisa o preço de
 * mercado do mesmo modelo/ano em anúncios brasileiros e devolve um parecer estruturado — pegadinhas,
 * oportunidades, cenários de risco e até onde vale a pena ir no lance.
 */
export const MODELO_IA = "claude-opus-5-5";

export const EsquemaAnalise = z.object({
  resumo: z.string().describe("3 a 5 frases, direto ao ponto, em português do Brasil"),
  veredito: z.enum(["boa_oportunidade", "neutra", "evitar"]),
  confianca: z.number().min(0).max(1).describe("quanto a análise confia nos dados disponíveis"),
  veiculo: z.object({
    marca: z.string().nullable(),
    modelo: z.string().nullable(),
    ano: z.string().nullable(),
    cor: z.string().nullable(),
    combustivel: z.string().nullable(),
    cambio: z.string().nullable(),
    km: z.string().nullable(),
    conservacao: z.string().nullable().describe("estado físico/mecânico relatado no edital"),
  }),
  valores: z.object({
    fipe: z.number().nullable(),
    mercado_min: z.number().nullable().describe("anúncio mais barato encontrado do mesmo modelo/ano"),
    mercado_max: z.number().nullable().describe("anúncio mais caro encontrado"),
    mercado_fontes: z.array(z.object({ titulo: z.string(), url: z.string(), preco: z.number().nullable() })).describe("até 6 anúncios com link"),
    avaliacao: z.number().nullable(),
    lance_inicial: z.number().nullable(),
    segunda_praca: z.number().nullable(),
    desconto_sobre_mercado_pct: z.number().nullable().describe("desconto do lance mínimo atual sobre o preço médio de mercado"),
  }),
  pagamento: z.object({
    admite_parcelamento: z.boolean().nullable(),
    entrada_pct: z.number().nullable(),
    parcelas: z.number().nullable(),
    comissao_pct: z.number().nullable(),
    observacoes: z.string().nullable(),
  }),
  pegadinhas: z.array(
    z.object({
      titulo: z.string(),
      gravidade: z.enum(["baixa", "media", "alta"]),
      detalhe: z.string().describe("o que diz o edital/documento e por que isso pesa"),
    }),
  ),
  oportunidades: z.array(z.string()),
  cenarios: z.array(
    z.object({
      nome: z.string(),
      probabilidade: z.enum(["baixa", "media", "alta"]),
      descricao: z.string(),
      resultado_financeiro: z.string().describe("ganho ou perda estimada em R$, com a conta"),
    }),
  ),
  recomendacoes: z.object({
    uso_proprio: z.object({
      recomenda: z.boolean(),
      nota: z.number().min(0).max(10).describe("0 a 10: quão boa é a compra para quem vai usar o carro"),
      motivo: z.string().describe("2 a 4 frases diretas"),
      custo_total_estimado: z.number().nullable().describe("lance mínimo + todos os custos para ter o carro rodando e documentado"),
      economia_vs_mercado: z.number().nullable().describe("quanto economiza frente a comprar pronto no mercado (negativo = sai mais caro)"),
    }),
    revenda: z.object({
      recomenda: z.boolean(),
      nota: z.number().min(0).max(10).describe("0 a 10: quão bom é como negócio de revenda"),
      motivo: z.string().describe("2 a 4 frases diretas, incluindo liquidez (facilidade de vender)"),
      preco_revenda_estimado: z.number().nullable().describe("preço realista de venda rápida (30 a 60 dias) depois de recuperado e documentado"),
      preco_revenda_min: z.number().nullable().describe("piso: venda rápida para lojista ou com defeito aparente"),
      preco_revenda_max: z.number().nullable().describe("teto: venda a particular, carro impecável"),
      prazo_venda_dias: z.number().nullable(),
      lucro_estimado: z.number().nullable().describe("preço de revenda estimado − (lance mínimo + custos totais); negativo = prejuízo"),
      margem_pct: z.number().nullable().describe("lucro estimado / custo total × 100"),
    }),
  }),
  cenarios_revenda: z.array(
    z.object({
      nome: z.string(),
      probabilidade: z.enum(["baixa", "media", "alta"]),
      descricao: z.string(),
      lance: z.number().nullable(),
      custos: z.array(z.object({ item: z.string(), valor: z.number().nullable() })).describe("cada custo até o carro estar à venda: comissão, custas, guincho, chave, mecânica, funilaria, documentação, estadia, anúncio"),
      custo_total: z.number().nullable().describe("lance + soma dos custos"),
      preco_venda: z.number().nullable(),
      lucro: z.number().nullable().describe("preço de venda − custo total"),
      prazo_dias: z.number().nullable(),
    }),
  ).describe("2 a 4 cenários de revenda, do otimista ao pessimista, sempre com a conta fechada"),
  lance_maximo: z.object({
    valor: z.number().nullable().describe("até onde ir no lance para uso próprio"),
    valor_revenda: z.number().nullable().describe("até onde ir no lance para ainda lucrar na revenda (pode ficar abaixo do lance mínimo: aí a revenda não compensa)"),
    justificativa: z.string(),
    custos_extras: z.array(z.object({ item: z.string(), valor: z.number().nullable() })).describe("comissão, débitos, documentação, reparos, transporte"),
  }),
  proximos_passos: z.array(z.string()),
  documentos_lidos: z.array(z.string()).describe("nomes dos documentos efetivamente lidos"),
});
export type Analise = z.infer<typeof EsquemaAnalise>;

const SISTEMA = `Você é analista sênior de leilões de veículos no Brasil (judiciais e extrajudiciais), trabalhando para a plataforma Veículo Sem Juros.
Seu leitor é um comprador comum, não advogado. Escreva em português do Brasil, direto, sem juridiquês, com números.

Método:
1. Leia a ficha do lote e TODOS os documentos anexados (edital, laudos). O edital manda: se a ficha e o edital divergirem, vale o edital e isso vira uma "pegadinha".
2. Procure explicitamente: débitos que passam ao arrematante (IPVA, multas, financiamento, sub-rogação art. 130 CTN), veículo sem documento/sem chave/sem motor, "venda no estado", sinistro ou recuperação, restrições judiciais, prazo e forma de pagamento, comissão do leiloeiro, custas, prazo de retirada e local, multas por desistência, possibilidade de remição/adjudicação pelo devedor, exigência de visita presencial.
3. Use a busca na web para encontrar anúncios ATUAIS do mesmo modelo e ano no Brasil (Webmotors, OLX, iCarros, Mobiauto, Mercado Livre). Registre o mais barato e o mais caro com link. Se não achar o ano exato, use o ano vizinho e diga isso.
4. Compare: lance mínimo vigente × FIPE × mercado. Some os custos extras (comissão, débitos, documentação, reparos prováveis, transporte) e calcule até onde o lance ainda deixa margem para quem quer usar e para quem quer revender.
5. Monte 2 a 4 cenários realistas (ex.: "carro bom e documentação ok", "débitos maiores que o previsto", "veículo sem motor") com probabilidade e resultado financeiro.
6. Responda separadamente duas perguntas: (a) recomendo para USO PRÓPRIO? (b) recomendo para REVENDA? Para revenda, estime por quanto o carro vende depois de recuperado e documentado (piso, teto e preço realista de venda em 30 a 60 dias), o prazo de venda e o lucro líquido. Lembre que revendedor precisa de pelo menos 15% a 20% de margem para compensar capital parado, estadia, anúncio e risco.
7. Monte 2 a 4 cenários de REVENDA com a conta fechada: lance + cada custo (comissão, custas, guincho, chave, mecânica, funilaria, documentação, estadia, anúncio) = custo total; preço de venda; lucro; prazo.
8. Diga até onde ir no lance para uso próprio e, separadamente, para revenda.
9. Dê um veredito honesto. Se faltar informação essencial (sem edital, sem fotos, sem valor), diga e reduza a confiança.

Nunca invente dados: tudo que não constar na ficha, nos documentos ou nos anúncios encontrados é "não informado".`;

interface Doc {
  nome: string;
  url: string;
}

async function baixarPdf(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36" } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 20 * 1024 * 1024 || buf.subarray(0, 5).toString() !== "%PDF-") return null;
    return buf.toString("base64");
  } catch {
    return null;
  }
}

/** Roda a análise de ponta a ponta com a sessão do usuário (ou de um admin). Idempotente por status. */
export async function processarAnalise(analiseId: string): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient();
  const { data: iniciou } = await supabase.rpc("iniciar_analise", { p_id: analiseId });
  if (!iniciou) return { ok: false, erro: "análise não está aguardando" };

  const concluir = async (resultado: Analise | null, erro: string | null, tokens = 0) => {
    const { error } = await supabase.rpc("concluir_analise", { p_id: analiseId, p_resultado: resultado, p_erro: erro, p_modelo: MODELO_IA, p_tokens: tokens });
    if (error) console.error("[analise] concluir_analise falhou:", analiseId, error.message);
  };

  try {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada no servidor");
    const { data: analise } = await supabase.from("analyses").select("auction_id").eq("id", analiseId).maybeSingle();
    if (!analise) throw new Error("análise não encontrada");
    const { data: ficha } = await supabase.rpc("ficha_para_analise", { p_auction: analise.auction_id });
    if (!ficha) throw new Error("ficha do lote indisponível (desbloqueie o leilão)");
    const f = ficha as Record<string, unknown>;
    const raw = (f.raw as Record<string, unknown>) ?? {};

    const fipe = await consultarFipe((f.marca as string | null) ?? null, String(f.titulo ?? ""), (f.ano as number | null) ?? null);
    const docs = (Array.isArray(raw.documentos) ? (raw.documentos as Doc[]) : []).filter((d) => d?.url).slice(0, 3);
    const pdfs = (await Promise.all(docs.map(async (d) => ({ nome: d.nome, b64: await baixarPdf(d.url) })))).filter((d) => d.b64) as { nome: string; b64: string }[];

    const fichaParaIa = {
      titulo: f.titulo, descricao: f.descricao, marca: f.marca, modelo: f.modelo, ano: f.ano, cidade: f.cidade, uf: f.uf, tipo: f.tipo,
      lance_1a_praca_ou_inicial: f.lance_1, lance_2a_praca: f.lance_2, lance_atual: f.lance_atual, encerra_em: f.encerra_em,
      link_do_lote: f.fonte_url, fonte: f.fonte, extras: { ...raw, documentos: docs.map((d) => d.nome) },
      fipe: fipe && !("nao_encontrado" in fipe) ? fipe : "não encontrada",
      documentos_anexados: pdfs.map((p) => p.nome),
      documentos_nao_baixados: docs.filter((d) => !pdfs.some((p) => p.nome === d.nome)).map((d) => `${d.nome} (${d.url})`),
    };

    const conteudo: Anthropic.ContentBlockParam[] = [
      ...pdfs.map<Anthropic.DocumentBlockParam>((p) => ({ type: "document", source: { type: "base64", media_type: "application/pdf", data: p.b64 }, title: p.nome })),
      { type: "text", text: `Ficha do lote (JSON):\n${JSON.stringify(fichaParaIa, null, 1)}\n\nFaça a análise completa seguindo o método.` },
    ];

    const client = new Anthropic();
    const resposta = await client.messages.parse({
      model: MODELO_IA,
      max_tokens: 16000,
      output_config: { effort: "high", format: zodOutputFormat(EsquemaAnalise) },
      system: SISTEMA,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6, user_location: { type: "approximate", country: "BR" } }],
      messages: [{ role: "user", content: conteudo }],
    });

    const tokens = resposta.usage.input_tokens + resposta.usage.output_tokens;
    if (resposta.stop_reason === "refusal") throw new Error("o modelo recusou a análise");
    const parsed = resposta.parsed_output;
    if (!parsed) throw new Error("resposta fora do formato esperado");
    await concluir(parsed, null, tokens);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : (e as Error).message;
    console.error("[analise]", analiseId, msg);
    await concluir(null, msg.slice(0, 500));
    return { ok: false, erro: msg };
  }
}
