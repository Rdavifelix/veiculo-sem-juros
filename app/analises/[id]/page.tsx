import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { usuarioAtual } from "@/lib/auth";
import { carteira } from "@/lib/creditos";
import { formatarDataHora, formatarReais } from "@/lib/formatar";
import type { Analise } from "@/lib/ia/analise";
import { buscarPorId } from "@/lib/leiloes/repositorio";
import { createClient } from "@/lib/supabase/server";
import { desmarcarParticipacao, marcarParticipacao, reprocessarAnalise } from "../actions";
import { participacaoDe } from "@/lib/participacoes";
import { BotaoImprimir } from "../BotaoImprimir";

export const metadata: Metadata = { title: "Análise do leilão", robots: { index: false } };
export const maxDuration = 300;

const VEREDITO: Record<string, { rotulo: string; cor: string }> = {
  boa_oportunidade: { rotulo: "Boa oportunidade", cor: "bg-[var(--verde)] text-white" },
  neutra: { rotulo: "Neutra", cor: "bg-neutral-700 text-white" },
  evitar: { rotulo: "Evitar", cor: "bg-red-600 text-white" },
};
const GRAVIDADE: Record<string, string> = { alta: "bg-red-50 text-red-800 border-red-200", media: "bg-amber-50 text-amber-800 border-amber-200", baixa: "bg-neutral-50 text-neutral-700 border-neutral-200" };
const PROB: Record<string, string> = { alta: "alta", media: "média", baixa: "baixa" };
const r$ = (v: number | null | undefined) => (v == null ? "não informado" : formatarReais(v));
const sinal = (v: number | null | undefined) => (v == null ? "não informado" : `${v < 0 ? "−" : "+"} ${formatarReais(Math.abs(v))}`);

export default async function PaginaAnalise({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ participar?: string }> }) {
  const { id } = await params;
  const { participar } = await searchParams;
  const usuario = await usuarioAtual();
  if (!usuario) redirect(`/login?next=/analises/${id}`);
  const supabase = await createClient();
  const [cart, { data: a }] = await Promise.all([carteira(), supabase.from("analyses").select("*").eq("id", id).maybeSingle()]);
  if (!a) redirect("/analises");
  const [leilao, participacao] = await Promise.all([buscarPorId(a.auction_id as string), participacaoDe(a.auction_id as string)]);
  const r = a.resultado as Analise | null;

  return (
    <>
      <Cabecalho usuario={usuario} carteira={cart} />
      <main className="mx-auto max-w-[1000px] px-4 py-6">
        <nav className="mb-3 text-sm text-neutral-600 print:hidden">
          <Link href="/analises" className="hover:text-neutral-900">Análises</Link> › <span className="text-neutral-900">{leilao?.titulo ?? "Leilão"}</span>
        </nav>

        {a.status !== "disponivel" || !r ? (
          <section className="rounded-md bg-white p-8 text-center shadow-sm" {...(a.status === "processando" || a.status === "aguardando" ? { "data-refresh": "" } : {})}>
            {a.status === "erro" ? (
              <>
                <p className="text-lg font-semibold text-red-700">A análise falhou</p>
                <p className="mt-1 text-sm text-neutral-600">{String(a.erro ?? "")}</p>
                <form action={reprocessarAnalise} className="mt-4">
                  <input type="hidden" name="id" value={id} />
                  <button className="rounded-sm bg-[var(--azul)] px-4 py-2 text-sm font-semibold text-white">Tentar de novo</button>
                </form>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold">Analisando o leilão…</p>
                <p className="mt-1 text-sm text-neutral-600">Estamos lendo o edital e os documentos, pesquisando o preço de mercado e montando os cenários. Leva de 1 a 3 minutos.</p>
                <meta httpEquiv="refresh" content="15" />
                <p className="mt-4 text-xs text-neutral-500">Esta página atualiza sozinha a cada 15 segundos.</p>
              </>
            )}
          </section>
        ) : (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-md bg-white shadow-sm">
              <div className="grid gap-0 sm:grid-cols-[220px_minmax(0,1fr)]">
                <div className="relative aspect-[4/3] bg-neutral-100 sm:aspect-auto sm:min-h-[180px] print:aspect-[4/3] print:self-start">
                  {leilao?.fotos[0] ? (
                    <Image src={leilao.fotos[0]} alt={leilao.titulo} fill sizes="(min-width: 640px) 220px, 100vw" className="object-cover" unoptimized priority />
                  ) : (
                    <span className="grid h-full place-items-center text-xs text-neutral-400">sem foto</span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="hidden text-xs font-semibold uppercase tracking-wide text-neutral-500 print:block">Veículo Sem Juros · Análise Premium</p>
                      <h1 className="text-xl font-semibold leading-snug">{leilao?.titulo ?? "Leilão"}</h1>
                      <p className="mt-1 text-xs text-neutral-500">
                        Análise concluída em {formatarDataHora(a.concluida_em as string)} · confiança {Math.round(r.confianca * 100)}%
                        {leilao && (
                          <>
                            {" · "}
                            <Link href={`/leilao/${leilao.id}`} className="text-[var(--azul)] print:hidden">ver ficha</Link>
                            <span className="hidden print:inline">{[leilao.cidade && `${leilao.cidade}/${leilao.uf ?? ""}`, leilao.valor != null && `lance ${formatarReais(leilao.valor)}`].filter(Boolean).join(" · ")}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <BotaoImprimir />
                      <span className={`rounded-sm px-3 py-1 text-sm font-bold uppercase tracking-wide ${VEREDITO[r.veredito]?.cor ?? ""}`}>{VEREDITO[r.veredito]?.rotulo ?? r.veredito}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-[15px] leading-relaxed text-neutral-800">{r.resumo}</p>
                </div>
              </div>
            </section>

            {r.recomendacoes && (
              <section className="grid gap-4 md:grid-cols-2">
                <Recomendacao
                  titulo="Para uso próprio"
                  rec={r.recomendacoes.uso_proprio}
                  linhas={[
                    ["Custo total estimado (carro rodando e documentado)", r$(r.recomendacoes.uso_proprio.custo_total_estimado)],
                    ["Economia frente ao mercado", sinal(r.recomendacoes.uso_proprio.economia_vs_mercado)],
                  ]}
                />
                <Recomendacao
                  titulo="Para revenda"
                  rec={r.recomendacoes.revenda}
                  linhas={[
                    ["Preço de revenda estimado (venda rápida)", r$(r.recomendacoes.revenda.preco_revenda_estimado)],
                    ["Faixa de revenda", r.recomendacoes.revenda.preco_revenda_min != null || r.recomendacoes.revenda.preco_revenda_max != null ? `${r$(r.recomendacoes.revenda.preco_revenda_min)} a ${r$(r.recomendacoes.revenda.preco_revenda_max)}` : "não informado"],
                    ["Prazo para vender", r.recomendacoes.revenda.prazo_venda_dias != null ? `${r.recomendacoes.revenda.prazo_venda_dias} dias` : "não informado"],
                    ["Lucro estimado", sinal(r.recomendacoes.revenda.lucro_estimado)],
                    ["Margem", r.recomendacoes.revenda.margem_pct != null ? `${r.recomendacoes.revenda.margem_pct.toFixed(1).replace(".", ",")}%` : "não informado"],
                  ]}
                />
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-2">
              <div className="min-w-0 rounded-md bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold">Valores</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <Linha rotulo="Tabela FIPE" valor={r$(r.valores.fipe)} />
                  <Linha rotulo="Mercado (mais barato)" valor={r$(r.valores.mercado_min)} />
                  <Linha rotulo="Mercado (mais caro)" valor={r$(r.valores.mercado_max)} />
                  <Linha rotulo="Avaliação do edital" valor={r$(r.valores.avaliacao)} />
                  <Linha rotulo="Lance inicial / 1ª praça" valor={r$(r.valores.lance_inicial)} />
                  <Linha rotulo="2ª praça" valor={r$(r.valores.segunda_praca)} />
                  {r.valores.desconto_sobre_mercado_pct != null && <Linha rotulo="Desconto sobre o mercado" valor={`${Math.round(r.valores.desconto_sobre_mercado_pct)}%`} destaque />}
                </dl>
                {r.valores.mercado_fontes.length > 0 && (
                  <>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">Anúncios encontrados</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {r.valores.mercado_fontes.map((f, i) => (
                        <li key={`${i}-${f.url}`} className="flex justify-between gap-3">
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-[var(--azul)]">{f.titulo}</a>
                          <span className="shrink-0 font-medium">{r$(f.preco)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div className="rounded-md border-2 border-[var(--verde)] bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold">Até onde ir no lance</h2>
                <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Uso próprio</p>
                    <p className="text-3xl font-semibold text-[var(--verde)]">{r$(r.lance_maximo.valor)}</p>
                  </div>
                  {r.lance_maximo.valor_revenda != null && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Revenda</p>
                      <p className={`text-3xl font-semibold ${r.valores.segunda_praca != null && r.lance_maximo.valor_revenda < r.valores.segunda_praca ? "text-red-600" : "text-neutral-800"}`}>{r$(r.lance_maximo.valor_revenda)}</p>
                      {r.valores.segunda_praca != null && r.lance_maximo.valor_revenda < r.valores.segunda_praca && (
                        <p className="text-xs text-red-700">abaixo do lance mínimo: revenda não compensa</p>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm text-neutral-700">{r.lance_maximo.justificativa}</p>
                {r.lance_maximo.custos_extras.length > 0 && (
                  <>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">Custos além do lance</p>
                    <dl className="mt-1 space-y-1 text-sm">
                      {r.lance_maximo.custos_extras.map((c) => (
                        <Linha key={c.item} rotulo={c.item} valor={r$(c.valor)} />
                      ))}
                    </dl>
                  </>
                )}
                <h3 className="mt-4 text-sm font-semibold">Pagamento</h3>
                <p className="text-sm text-neutral-700">
                  {r.pagamento.admite_parcelamento ? `Admite parcelamento: entrada ${r.pagamento.entrada_pct ?? "—"}%, até ${r.pagamento.parcelas ?? "—"} parcelas.` : r.pagamento.admite_parcelamento === false ? "À vista." : "Condições não informadas."}
                  {r.pagamento.comissao_pct != null && ` Comissão ${r.pagamento.comissao_pct}%.`}
                  {r.pagamento.observacoes && ` ${r.pagamento.observacoes}`}
                </p>
              </div>
            </section>

            <section className="rounded-md bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold">Pegadinhas e pontos de atenção</h2>
              {r.pegadinhas.length ? (
                <ul className="mt-3 space-y-2">
                  {r.pegadinhas.map((p) => (
                    <li key={p.titulo} className={`rounded-sm border p-3 text-sm ${GRAVIDADE[p.gravidade]}`}>
                      <p className="font-semibold">
                        <span className="mr-2 rounded-sm bg-white/70 px-1.5 py-px text-[10px] uppercase tracking-wide">{p.gravidade === "media" ? "média" : p.gravidade}</span>
                        {p.titulo}
                      </p>
                      <p className="mt-1">{p.detalhe}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-neutral-600">Nenhuma pegadinha relevante encontrada nos documentos lidos.</p>
              )}
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold">Oportunidades</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                  {r.oportunidades.map((o) => <li key={o}>{o}</li>)}
                </ul>
              </div>
              <div className="rounded-md bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold">Veículo</h2>
                <dl className="mt-2 space-y-1 text-sm">
                  <Linha rotulo="Marca / modelo" valor={[r.veiculo.marca, r.veiculo.modelo].filter(Boolean).join(" ") || "não informado"} />
                  <Linha rotulo="Ano" valor={r.veiculo.ano ?? "não informado"} />
                  <Linha rotulo="Cor" valor={r.veiculo.cor ?? "não informado"} />
                  <Linha rotulo="Combustível" valor={r.veiculo.combustivel ?? "não informado"} />
                  <Linha rotulo="Câmbio" valor={r.veiculo.cambio ?? "não informado"} />
                  <Linha rotulo="Km" valor={r.veiculo.km ?? "não informado"} />
                  <Linha rotulo="Conservação" valor={r.veiculo.conservacao ?? "não informado"} />
                </dl>
              </div>
            </section>

            <section className="rounded-md bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold">Cenários de risco</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {r.cenarios.map((c) => (
                  <div key={c.nome} className="rounded-sm border border-neutral-200 p-3 text-sm">
                    <p className="font-semibold">
                      {c.nome} <span className="ml-1 text-xs font-normal text-neutral-500">probabilidade {PROB[c.probabilidade] ?? c.probabilidade}</span>
                    </p>
                    <p className="mt-1 text-neutral-700">{c.descricao}</p>
                    <p className="mt-2 font-medium">{c.resultado_financeiro}</p>
                  </div>
                ))}
              </div>
            </section>

            {r.cenarios_revenda && r.cenarios_revenda.length > 0 && (
              <section className="rounded-md bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold">Cenários de revenda, com custos</h2>
                <p className="mt-1 text-xs text-neutral-500">Cada cenário fecha a conta: lance + todos os custos até o carro estar à venda, contra o preço de venda esperado.</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {r.cenarios_revenda.map((c) => (
                    <div key={c.nome} className={`rounded-sm border p-3 text-sm ${c.lucro != null && c.lucro < 0 ? "border-red-200" : "border-neutral-200"}`}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-semibold">{c.nome}</p>
                        <span className="text-xs text-neutral-500">probabilidade {PROB[c.probabilidade] ?? c.probabilidade}{c.prazo_dias != null && ` · ${c.prazo_dias} dias`}</span>
                      </div>
                      <p className="mt-1 text-neutral-700">{c.descricao}</p>
                      <table className="mt-3 w-full text-[13px]">
                        <tbody>
                          <tr><td className="py-0.5 text-neutral-600">Lance</td><td className="py-0.5 text-right font-medium">{r$(c.lance)}</td></tr>
                          {c.custos.map((k) => (
                            <tr key={k.item}><td className="py-0.5 pl-3 text-neutral-600">+ {k.item}</td><td className="py-0.5 text-right">{r$(k.valor)}</td></tr>
                          ))}
                          <tr className="border-t border-neutral-200"><td className="py-1 font-semibold">Custo total</td><td className="py-1 text-right font-semibold">{r$(c.custo_total)}</td></tr>
                          <tr><td className="py-0.5 text-neutral-600">Preço de venda</td><td className="py-0.5 text-right font-medium">{r$(c.preco_venda)}</td></tr>
                          <tr className="border-t border-neutral-200">
                            <td className="py-1 font-semibold">{c.lucro != null && c.lucro < 0 ? "Prejuízo" : "Lucro"}</td>
                            <td className={`py-1 text-right text-base font-semibold ${c.lucro == null ? "" : c.lucro < 0 ? "text-red-600" : "text-[var(--verde)]"}`}>{sinal(c.lucro)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section id="participar" className={`rounded-md border-2 bg-white p-5 shadow-sm print:hidden ${participacao ? "border-[var(--verde)]" : "border-[var(--amarelo)]"}`}>
              {participacao ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold">Você vai participar deste leilão</h2>
                      <p className="mt-1 text-sm text-neutral-700">
                        Está na sua <Link href="/agenda" className="font-semibold text-[var(--azul)]">Agenda</Link>
                        {leilao?.encerra_em && <> · encerra <strong>{formatarDataHora(leilao.encerra_em)}</strong></>}
                        {participacao.lance_maximo != null && <> · seu teto <strong className="text-[var(--verde)]">{formatarReais(participacao.lance_maximo)}</strong></>}
                        {participacao.observacao && <> · {participacao.observacao}</>}
                      </p>
                    </div>
                    <form action={desmarcarParticipacao}>
                      <input type="hidden" name="auction_id" value={a.auction_id as string} />
                      <input type="hidden" name="voltar" value={`/analises/${id}#participar`} />
                      <button className="rounded-sm border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:border-red-400 hover:text-red-700">Não vou mais participar</button>
                    </form>
                  </div>
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer font-semibold text-[var(--azul)]">Alterar teto ou observação</summary>
                    <FormParticipar auctionId={a.auction_id as string} voltar={`/analises/${id}#participar`} lance={participacao.lance_maximo} observacao={participacao.observacao} rotulo="Salvar" />
                  </details>
                </>
              ) : (
                <>
                  <h2 className="text-base font-semibold">Vai participar deste leilão?</h2>
                  <p className="mt-1 text-sm text-neutral-700">
                    Marque para ele entrar na sua Agenda com a data de encerramento{leilao?.encerra_em && <> (<strong>{formatarDataHora(leilao.encerra_em)}</strong>)</>} e o teto que você definiu.
                    {r.lance_maximo.valor != null && <> Sugestão da análise para uso próprio: <strong className="text-[var(--verde)]">{formatarReais(r.lance_maximo.valor)}</strong>.</>}
                  </p>
                  {participar === "removido" && <p className="mt-2 rounded-sm bg-neutral-100 px-3 py-2 text-sm text-neutral-700">Removido da sua Agenda.</p>}
                  {participar === "sem_desbloqueio" && <p className="mt-2 rounded-sm bg-red-50 px-3 py-2 text-sm text-red-700">Desbloqueie o leilão antes de marcar participação.</p>}
                  {participar && !["ok", "removido", "sem_desbloqueio"].includes(participar) && <p className="mt-2 rounded-sm bg-red-50 px-3 py-2 text-sm text-red-700">Não foi possível marcar: {participar}</p>}
                  <FormParticipar auctionId={a.auction_id as string} voltar={`/analises/${id}#participar`} lance={r.lance_maximo.valor} observacao={null} rotulo="Sim, vou participar" />
                </>
              )}
            </section>

            <section className="rounded-md bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold">Próximos passos</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-neutral-700">
                {r.proximos_passos.map((p) => <li key={p}>{p}</li>)}
              </ol>
              <p className="mt-4 text-xs text-neutral-500">
                Documentos lidos: {r.documentos_lidos.length ? r.documentos_lidos.join(", ") : "nenhum PDF anexado; análise feita a partir da ficha e da pesquisa de mercado"}. Análise gerada por IA com base em documentos públicos; tem natureza informativa e não substitui a leitura do edital nem assessoria jurídica.
              </p>
            </section>
          </div>
        )}
      </main>
      <Rodape />
    </>
  );
}

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-neutral-600">{rotulo}</dt>
      <dd className={`text-right ${destaque ? "font-semibold text-[var(--verde)]" : "font-medium"}`}>{valor}</dd>
    </div>
  );
}

type Rec = { recomenda: boolean; nota: number; motivo: string };
function Recomendacao({ titulo, rec, linhas }: { titulo: string; rec: Rec; linhas: [string, string][] }) {
  const nota = Math.max(0, Math.min(10, Math.round(rec.nota)));
  return (
    <div className={`rounded-md border-2 bg-white p-5 shadow-sm ${rec.recomenda ? "border-[var(--verde)]" : "border-red-300"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{titulo}</h2>
        <span className={`rounded-sm px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white ${rec.recomenda ? "bg-[var(--verde)]" : "bg-red-600"}`}>
          {rec.recomenda ? "Recomendado" : "Não recomendado"}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl font-semibold leading-none">{nota}<span className="text-base font-normal text-neutral-500">/10</span></span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100" aria-hidden>
          <div className={`h-full rounded-full ${rec.recomenda ? "bg-[var(--verde)]" : "bg-red-500"}`} style={{ width: `${nota * 10}%` }} />
        </div>
      </div>
      <p className="mt-3 text-sm text-neutral-700">{rec.motivo}</p>
      <dl className="mt-3 space-y-1 border-t border-neutral-100 pt-3 text-sm">
        {linhas.map(([k, v]) => <Linha key={k} rotulo={k} valor={v} />)}
      </dl>
    </div>
  );
}

function FormParticipar({ auctionId, voltar, lance, observacao, rotulo }: { auctionId: string; voltar: string; lance: number | null; observacao: string | null; rotulo: string }) {
  return (
    <form action={marcarParticipacao} className="mt-3 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
      <input type="hidden" name="auction_id" value={auctionId} />
      <input type="hidden" name="voltar" value={voltar} />
      <label className="text-xs font-semibold text-neutral-600">
        Meu lance máximo (R$)
        <input name="lance_maximo" inputMode="decimal" defaultValue={lance != null ? Math.round(lance).toLocaleString("pt-BR") : ""} placeholder="ex.: 66.000" className="mt-1 h-11 w-full rounded-sm border border-neutral-300 px-3 text-sm font-medium text-neutral-900" />
      </label>
      <label className="text-xs font-semibold text-neutral-600">
        Observação (opcional)
        <input name="observacao" defaultValue={observacao ?? ""} maxLength={140} placeholder="ex.: visitar o pátio antes; levar caução" className="mt-1 h-11 w-full rounded-sm border border-neutral-300 px-3 text-sm text-neutral-900" />
      </label>
      <button className="h-11 rounded-sm bg-[var(--verde)] px-5 text-sm font-semibold text-white hover:brightness-95">{rotulo}</button>
    </form>
  );
}
