import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { usuarioAtual } from "@/lib/auth";
import { carteira, desbloquear, idsDesbloqueados } from "@/lib/creditos";
import { capitalizarTitulo, formatarDataHora, formatarMilhar, formatarReais, rotuloEncerramento } from "@/lib/formatar";
import { detalheLeilao } from "@/lib/leiloes/detalhe";
import { consultarFipe } from "@/lib/fipe";
import { solicitarAnalise } from "@/app/analises/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ficha do leilão", robots: { index: false } };

/**
 * Ficha interna do lote (só para quem desbloqueou).
 * Layout: no celular/tablet uma coluna na ordem foto → valores → pagamento → leiloeiro → detalhes, com barra fixa
 * de ação no rodapé; no desktop (≥1024px) duas colunas, com valores/pagamento/leiloeiro fixos à direita.
 */
export default async function FichaLeilao({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ analise?: string }> }) {
  const { id } = await params;
  const { analise: avisoAnalise } = await searchParams;
  const usuario = await usuarioAtual();
  if (!usuario) redirect(`/login?next=/leilao/${id}`);
  const desbloqueados = await idsDesbloqueados();
  if (!desbloqueados.has(id)) redirect(`/leilao/${id}/acessar`);

  const [l, cart, link] = await Promise.all([detalheLeilao(id), carteira(), desbloquear(id)]);
  if (!l) redirect("/desbloqueados");
  const premium = cart.plano.fipe || cart.plano.analises_mes > 0;
  const supabase = await createClient();
  const [fipe, { data: analiseExistente }] = await Promise.all([
    premium ? consultarFipe(l.marca, l.titulo, l.ano) : Promise.resolve(null),
    supabase.from("analyses").select("id, status").eq("auction_id", id).maybeSingle(),
  ]);
  const fipeOk = fipe && !("nao_encontrado" in fipe) ? fipe : null;
  const descontoFipe = fipeOk && l.valor ? Math.round((1 - l.valor / fipeOk.valor) * 100) : null;
  const urlLeiloeiro = "url" in link ? link.url : null;
  const enc = rotuloEncerramento(l.encerra_em);
  const titulo = capitalizarTitulo(l.titulo);
  const fotos = l.fotosTodas;
  const rotuloValor = l.lance_atual != null ? "Lance atual" : l.lance_2 != null ? "2ª praça" : "Lance inicial";

  return (
    <>
      <Cabecalho usuario={usuario} carteira={cart} />
      <main className="mx-auto max-w-[1200px] px-4 pb-28 pt-4 lg:pb-10 lg:pt-6">
        <nav className="mb-3 truncate text-xs text-neutral-600 sm:text-sm" aria-label="Navegação">
          <Link href="/busca" className="hover:text-neutral-900">Busca</Link> › <Link href="/desbloqueados" className="hover:text-neutral-900">Desbloqueados</Link> › <span className="text-neutral-900">{titulo}</span>
        </nav>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
          {/* 1. Galeria */}
          <section className="min-w-0 overflow-hidden rounded-md bg-white shadow-sm lg:col-start-1 lg:row-start-1">
            <div className="relative aspect-[4/3] bg-neutral-100">
              {fotos[0] ? (
                <Image src={fotos[0]} alt={titulo} fill sizes="(min-width:1024px) 820px, 100vw" className="object-contain" unoptimized priority />
              ) : (
                <div className="grid h-full place-items-center text-neutral-400">Imagem não disponível</div>
              )}
              <span className={`absolute right-3 top-3 rounded-sm px-2 py-0.5 text-xs font-semibold shadow-sm ${enc.urgente ? "bg-[var(--laranja)] text-white" : "bg-white/95"}`}>{enc.texto}</span>
              {fotos.length > 1 && <span className="absolute bottom-3 right-3 rounded-sm bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">{fotos.length} fotos</span>}
            </div>
            {fotos.length > 1 && (
              <div className="flex snap-x gap-2 overflow-x-auto p-3 [scrollbar-width:thin]">
                {fotos.slice(1, 13).map((f) => (
                  <a key={f} href={f} target="_blank" rel="noopener noreferrer" className="relative h-16 w-24 shrink-0 snap-start overflow-hidden rounded-sm bg-neutral-100 sm:h-20 sm:w-28">
                    <Image src={f} alt="" fill sizes="112px" className="object-cover" unoptimized />
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* 2. Valores · pagamento · leiloeiro (direita no desktop, logo após a foto no celular) */}
          <aside className="min-w-0 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:space-y-6">
            <section className="rounded-md bg-white p-4 shadow-sm sm:p-5">
              <h1 className="text-lg font-semibold leading-snug lg:hidden">{titulo}</h1>
              <div className="mt-2 grid grid-cols-2 gap-2 lg:mt-0">
                {l.lance_1 != null && l.lance_2 != null ? (
                  <>
                    <div className="rounded-sm border border-neutral-200 p-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">1ª praça</p>
                      <p className="text-lg font-semibold leading-tight text-neutral-700">{formatarReais(l.lance_1)}</p>
                      {l.praca1 && <p className="text-xs text-neutral-500">até {formatarDataHora(l.praca1)}</p>}
                    </div>
                    <div className="rounded-sm border-2 border-[var(--verde)] bg-[var(--verde)]/5 p-2.5">
                      <p className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-[var(--verde)]">
                        2ª praça
                        {l.descontoPct ? <span className="rounded-sm bg-[var(--verde)] px-1 py-px text-[10px] text-white">-{l.descontoPct}%</span> : null}
                      </p>
                      <p className="text-lg font-semibold leading-tight text-neutral-900">{formatarReais(l.lance_2)}</p>
                      {l.praca2 && <p className="text-xs text-neutral-600">até {formatarDataHora(l.praca2)}</p>}
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{rotuloValor}</p>
                    <p className="text-3xl font-semibold leading-tight">{l.valor != null ? formatarReais(l.valor) : "A definir"}</p>
                    {l.lance_atual != null && l.lance_1 != null && l.lance_1 !== l.lance_atual && <p className="text-xs text-neutral-500">lance inicial {formatarReais(l.lance_1)}</p>}
                  </div>
                )}
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <Linha rotulo="Próximo encerramento" valor={l.encerra_em ? formatarDataHora(l.encerra_em) : "a confirmar"} destaque />
                {l.lances != null && <Linha rotulo="Lances" valor={String(l.lances)} />}
                {l.visitas != null && <Linha rotulo="Visitas" valor={formatarMilhar(l.visitas)} />}
              </dl>
            </section>

            {/* Premium: FIPE, mercado e análise por IA */}
            <section className="rounded-md border border-neutral-900/10 bg-neutral-900 p-4 text-white shadow-sm sm:p-5">
              <h2 className="flex items-center justify-between text-base font-semibold">
                Inteligência Premium
                <span className="rounded-full bg-[var(--amarelo)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-900">VSJ Premium</span>
              </h2>
              {premium ? (
                <>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-neutral-300">Tabela FIPE</dt>
                      <dd className="text-right">
                        {fipeOk ? (
                          <>
                            <span className="text-lg font-semibold">{formatarReais(fipeOk.valor)}</span>
                            {descontoFipe != null && descontoFipe > 0 && <span className="ml-2 rounded-sm bg-[var(--verde)] px-1.5 py-px text-xs font-semibold">-{descontoFipe}% vs. lance</span>}
                          </>
                        ) : (
                          <span className="text-neutral-400">{fipe === null ? "indisponível agora" : "modelo não encontrado"}</span>
                        )}
                      </dd>
                    </div>
                    {fipeOk && (
                      <p className="text-xs text-neutral-400">
                        {fipeOk.marca} {fipeOk.modelo} · {fipeOk.ano} · ref. {fipeOk.referencia} · código {fipeOk.codigo}
                        {fipeOk.confianca < 0.8 && " · confira se o modelo FIPE corresponde ao lote"}
                      </p>
                    )}
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-neutral-300">Valor de mercado</dt>
                      <dd className="text-right text-xs text-neutral-400">do mais barato ao mais caro: na análise, com os anúncios e links</dd>
                    </div>
                  </dl>
                  {analiseExistente ? (
                    <Link href={`/analises/${analiseExistente.id}`} className="mt-4 flex min-h-11 items-center justify-center rounded-sm bg-[var(--amarelo)] px-3 py-2.5 text-sm font-semibold text-neutral-900">
                      {analiseExistente.status === "disponivel" ? "Ver análise do veículo" : analiseExistente.status === "erro" ? "Análise falhou · ver detalhes" : "Análise em andamento · acompanhar"}
                    </Link>
                  ) : (
                    <form action={solicitarAnalise} className="mt-4">
                      <input type="hidden" name="auction_id" value={id} />
                      <button type="submit" disabled={cart.analisesUsadas >= cart.analisesLimite} className="flex min-h-11 w-full items-center justify-center rounded-sm bg-[var(--amarelo)] px-3 py-2.5 text-sm font-semibold text-neutral-900 disabled:opacity-50">
                        Pedir análise do veículo
                      </button>
                      <p className="mt-2 text-center text-xs text-neutral-400">
                        {cart.analisesUsadas}/{cart.analisesLimite} análises usadas este mês · a IA lê o edital e os documentos, aponta pegadinhas, cenários e até onde ir no lance
                      </p>
                    </form>
                  )}
                  {avisoAnalise && (
                    <p className="mt-2 rounded-sm bg-red-900/40 px-3 py-2 text-xs text-red-100">
                      {avisoAnalise === "cota" ? "Cota de análises do mês esgotada." : avisoAnalise === "plano" ? "Seu plano não inclui análises." : avisoAnalise === "desbloqueio" ? "Desbloqueie o leilão antes." : "Não foi possível pedir a análise agora."}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <ul className="mt-3 space-y-1 text-sm text-neutral-300">
                    <li>• Tabela FIPE do veículo e desconto real do lance</li>
                    <li>• Valor de mercado, do anúncio mais barato ao mais caro</li>
                    <li>• Análise por IA: edital, pegadinhas, cenários de risco e até onde ir no lance</li>
                    <li>• Buscas ilimitadas</li>
                  </ul>
                  <p className="mt-3 text-sm font-semibold text-[var(--amarelo)]">Disponível no VSJ Premium · fale com a gente no WhatsApp</p>
                </>
              )}
            </section>

            <section className="rounded-md bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-semibold">Pagamento</h2>
              {l.tipo === "judicial" && !l.parcelavel ? (
                <ul className="mt-2 space-y-1 text-sm text-neutral-700">
                  <li>⚠️ Leilão judicial <strong>sem parcelamento</strong>: o edital exige pagamento à vista (alienação antecipada criminal ou regra do juízo)</li>
                  <li className="text-xs text-neutral-500">Leia as condições de venda abaixo e confirme no edital.</li>
                </ul>
              ) : l.parcelavel ? (
                <ul className="mt-2 space-y-1 text-sm text-neutral-700">
                  <li>✅ Leilão judicial: admite parcelamento</li>
                  <li>Entrada de <strong>25%</strong> e saldo em até <strong>30 parcelas</strong></li>
                  <li>Comissão do leiloeiro: normalmente 5%</li>
                  <li className="text-xs text-neutral-500">Confirme no edital: cada juízo define correção e garantia.</li>
                </ul>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-neutral-700">
                  <li>Pagamento à vista{l.financiavel ? ` · ${l.financiavel.toLowerCase()}` : ""}</li>
                  {l.maxParcelas ? <li>Condição do leiloeiro: entrada {l.entradaMinPct ?? "—"}% e até {l.maxParcelas}x</li> : null}
                  <li className="text-xs text-neutral-500">Leilão extrajudicial: taxas e prazos conforme o leiloeiro.</li>
                </ul>
              )}
            </section>

            <section className="rounded-md border-2 border-[var(--verde)] bg-white p-4 shadow-sm sm:p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 7.5-2" /></svg>
                Leiloeiro
              </h2>
              <p className="mt-2 text-lg font-bold">{l.leiloeiro}</p>
              {l.leiloeiroNome && <p className="text-sm text-neutral-600">{l.leiloeiroNome}</p>}
              {l.plataforma && <p className="text-sm text-neutral-600">Plataforma: {l.plataforma}</p>}
              {l.comitente && <p className="text-sm text-neutral-600">Comitente (vendedor): {l.comitente}</p>}
              {urlLeiloeiro && (
                <a href={urlLeiloeiro} target="_blank" rel="noopener noreferrer" className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-sm bg-[var(--azul)] px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#2968c8]">
                  Abrir lote no site do leiloeiro ↗
                </a>
              )}
              {l.paginaLeilao && (
                <a href={l.paginaLeilao} target="_blank" rel="noopener noreferrer" className="mt-2 block min-h-11 py-2.5 text-center text-sm font-semibold text-[var(--azul)]">
                  Página do leilão (edital e regras) ↗
                </a>
              )}
              <p className="mt-2 text-xs text-neutral-500">O lance é dado no site do leiloeiro. Nós não intermediamos pagamentos.</p>
            </section>
          </aside>

          {/* 3. Detalhes, edital e documentos */}
          <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-2 lg:space-y-6">
            <section className="rounded-md bg-white p-4 shadow-sm sm:p-5">
              <h1 className="hidden text-2xl font-semibold leading-tight lg:block">{titulo}</h1>
              <p className="text-sm text-neutral-600 lg:mt-1">
                {[l.marca, l.modelo && l.modelo !== l.titulo ? l.modelo : null, l.ano, l.cor, l.combustivel, l.km != null ? `${formatarMilhar(l.km)} km` : null, l.placa ? `placa ${l.placa}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <Info rotulo="Tipo" valor={l.tipo === "judicial" ? "Judicial" : l.tipo === "extrajudicial" ? "Extrajudicial" : "Não informado"} />
                <Info rotulo="Categoria" valor={{ carro: "Carro", moto: "Moto", caminhao: "Caminhão/pesado", outro: "Outro" }[l.categoria]} />
                <Info rotulo="Localização" valor={[l.cidade, l.uf].filter(Boolean).join("/") || "—"} />
                <Info rotulo="Sinistro" valor={l.sinistro ?? "não informado"} />
              </dl>
              {l.descricaoCompleta && (
                <>
                  <h2 className="mt-6 text-base font-semibold">Descrição do edital</h2>
                  <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-neutral-700">{l.descricaoCompleta}</p>
                </>
              )}
              {(l.processo || l.autor || l.executado) && (
                <>
                  <h2 className="mt-6 text-base font-semibold">Processo</h2>
                  <dl className="mt-2 grid gap-3 text-sm md:grid-cols-3">
                    <Info rotulo="Nº do processo" valor={l.processo ?? "—"} />
                    <Info rotulo="Exequente / autor" valor={l.autor ?? "—"} />
                    <Info rotulo="Executado" valor={l.executado ?? "—"} />
                  </dl>
                </>
              )}
              {l.condicoes && (
                <>
                  <h2 className="mt-6 text-base font-semibold">Condições de venda</h2>
                  <p className="mt-2 break-words text-sm leading-relaxed text-neutral-700">{l.condicoes}</p>
                </>
              )}
            </section>

            <section className="rounded-md bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-semibold">Edital e documentos</h2>
              {l.documentos.length ? (
                <ul className="mt-3 divide-y divide-neutral-100">
                  {l.documentos.map((d, i) => (
                    <li key={d.url} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 rounded-sm bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">{d.tipo}</span>
                        <span className="truncate">{d.nome}</span>
                      </span>
                      <Link href={`/leilao/${id}/documento/${i}`} target="_blank" className="shrink-0 rounded-sm border border-[var(--azul)] px-3 py-1.5 font-semibold text-[var(--azul)]">
                        Abrir
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-neutral-600">
                  Este leiloeiro publica o edital na página do leilão, não como arquivo separado.
                  {l.paginaLeilao && (
                    <>
                      {" "}
                      <a href={l.paginaLeilao} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--azul)]">Abrir página do leilão ↗</a>
                    </>
                  )}
                </p>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Barra fixa no celular/tablet: valor + ação principal sempre à mão */}
      {urlLeiloeiro && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,.08)] backdrop-blur lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{rotuloValor}</p>
              <p className="truncate text-lg font-semibold leading-tight">{l.valor != null ? formatarReais(l.valor) : "A definir"}</p>
            </div>
            <a href={urlLeiloeiro} target="_blank" rel="noopener noreferrer" className="flex min-h-11 shrink-0 items-center rounded-sm bg-[var(--azul)] px-4 text-sm font-semibold text-white">
              Abrir no leiloeiro ↗
            </a>
          </div>
        </div>
      )}
      <Rodape />
    </>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{rotulo}</dt>
      <dd className="break-words font-medium">{valor}</dd>
    </div>
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
