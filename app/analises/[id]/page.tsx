import type { Metadata } from "next";
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
import { reprocessarAnalise } from "../actions";

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

export default async function PaginaAnalise({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await usuarioAtual();
  if (!usuario) redirect(`/login?next=/analises/${id}`);
  const supabase = await createClient();
  const [cart, { data: a }] = await Promise.all([carteira(), supabase.from("analyses").select("*").eq("id", id).maybeSingle()]);
  if (!a) redirect("/analises");
  const leilao = await buscarPorId(a.auction_id as string);
  const r = a.resultado as Analise | null;

  return (
    <>
      <Cabecalho usuario={usuario} carteira={cart} />
      <main className="mx-auto max-w-[1000px] px-4 py-6">
        <nav className="mb-3 text-sm text-neutral-600">
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
            <section className="rounded-md bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold leading-snug">{leilao?.titulo ?? "Leilão"}</h1>
                  <p className="mt-1 text-xs text-neutral-500">
                    Análise concluída em {formatarDataHora(a.concluida_em as string)} · confiança {Math.round(r.confianca * 100)}%
                    {leilao && (
                      <>
                        {" · "}
                        <Link href={`/leilao/${leilao.id}`} className="text-[var(--azul)]">ver ficha</Link>
                      </>
                    )}
                  </p>
                </div>
                <span className={`rounded-sm px-3 py-1 text-sm font-bold uppercase tracking-wide ${VEREDITO[r.veredito]?.cor ?? ""}`}>{VEREDITO[r.veredito]?.rotulo ?? r.veredito}</span>
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-neutral-800">{r.resumo}</p>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md bg-white p-5 shadow-sm">
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
                      {r.valores.mercado_fontes.map((f) => (
                        <li key={f.url} className="flex justify-between gap-3">
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="truncate text-[var(--azul)]">{f.titulo}</a>
                          <span className="shrink-0 font-medium">{r$(f.preco)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div className="rounded-md border-2 border-[var(--verde)] bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold">Até onde ir no lance</h2>
                <p className="mt-2 text-3xl font-semibold text-[var(--verde)]">{r$(r.lance_maximo.valor)}</p>
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
              <h2 className="text-base font-semibold">Cenários</h2>
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
