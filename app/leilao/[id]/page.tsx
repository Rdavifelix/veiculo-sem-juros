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

export const metadata: Metadata = { title: "Ficha do leilão", robots: { index: false } };

/** Ficha interna do lote. Só para quem desbloqueou: quem não desbloqueou cai na confirmação de 1 crédito. */
export default async function FichaLeilao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await usuarioAtual();
  if (!usuario) redirect(`/login?next=/leilao/${id}`);
  const desbloqueados = await idsDesbloqueados();
  if (!desbloqueados.has(id)) redirect(`/leilao/${id}/acessar`);

  const [l, cart, link] = await Promise.all([detalheLeilao(id), carteira(), desbloquear(id)]);
  if (!l) redirect("/desbloqueados");
  const urlLeiloeiro = "url" in link ? link.url : null;
  const enc = rotuloEncerramento(l.encerra_em);
  const titulo = capitalizarTitulo(l.titulo);

  return (
    <>
      <Cabecalho usuario={usuario} carteira={cart} />
      <main className="mx-auto max-w-[1200px] px-4 py-6">
        <nav className="mb-4 text-sm text-neutral-600" aria-label="Navegação">
          <Link href="/busca" className="hover:text-neutral-900">Busca</Link> › <Link href="/desbloqueados" className="hover:text-neutral-900">Desbloqueados</Link> › <span className="text-neutral-900">{titulo.slice(0, 60)}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Coluna esquerda: fotos + descrição + documentos */}
          <div className="space-y-6">
            <section className="overflow-hidden rounded-md bg-white shadow-sm">
              <div className="relative aspect-[4/3] bg-neutral-100">
                {l.fotosTodas[0] ? (
                  <Image src={l.fotosTodas[0]} alt={titulo} fill sizes="(min-width:1024px) 700px, 100vw" className="object-contain" unoptimized priority />
                ) : (
                  <div className="grid h-full place-items-center text-neutral-400">Imagem não disponível</div>
                )}
                <span className={`absolute right-3 top-3 rounded-sm px-2 py-0.5 text-xs font-semibold shadow-sm ${enc.urgente ? "bg-[var(--laranja)] text-white" : "bg-white/95"}`}>{enc.texto}</span>
              </div>
              {l.fotosTodas.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {l.fotosTodas.slice(1, 13).map((f) => (
                    <a key={f} href={f} target="_blank" rel="noopener noreferrer" className="relative h-20 w-28 shrink-0 overflow-hidden rounded-sm bg-neutral-100">
                      <Image src={f} alt="" fill sizes="112px" className="object-cover" unoptimized />
                    </a>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-md bg-white p-5 shadow-sm">
              <h1 className="text-2xl font-semibold leading-tight">{titulo}</h1>
              <p className="mt-1 text-sm text-neutral-600">
                {[l.marca, l.modelo && l.modelo !== l.titulo ? l.modelo : null, l.ano, l.cor, l.combustivel, l.km != null ? `${formatarMilhar(l.km)} km` : null, l.placa ? `placa ${l.placa}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Info rotulo="Tipo" valor={l.tipo === "judicial" ? "Judicial" : l.tipo === "extrajudicial" ? "Extrajudicial" : "Não informado"} />
                <Info rotulo="Categoria" valor={{ carro: "Carro", moto: "Moto", caminhao: "Caminhão/pesado", outro: "Outro" }[l.categoria]} />
                <Info rotulo="Localização" valor={[l.cidade, l.uf].filter(Boolean).join("/") || "—"} />
                <Info rotulo="Sinistro" valor={l.sinistro ?? "não informado"} />
              </dl>
              {l.descricaoCompleta && (
                <>
                  <h2 className="mt-6 text-base font-semibold">Descrição do edital</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-700">{l.descricaoCompleta}</p>
                </>
              )}
              {(l.processo || l.autor || l.executado) && (
                <>
                  <h2 className="mt-6 text-base font-semibold">Processo</h2>
                  <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                    <Info rotulo="Nº do processo" valor={l.processo ?? "—"} />
                    <Info rotulo="Exequente / autor" valor={l.autor ?? "—"} />
                    <Info rotulo="Executado" valor={l.executado ?? "—"} />
                  </dl>
                </>
              )}
              {l.condicoes && (
                <>
                  <h2 className="mt-6 text-base font-semibold">Condições de venda</h2>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-700">{l.condicoes}</p>
                </>
              )}
            </section>

            <section className="rounded-md bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold">Edital e documentos</h2>
              {l.documentos.length ? (
                <ul className="mt-3 divide-y divide-neutral-100">
                  {l.documentos.map((d, i) => (
                    <li key={d.url} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="rounded-sm bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">{d.tipo}</span>
                        {d.nome}
                      </span>
                      <Link href={`/leilao/${id}/documento/${i}`} target="_blank" className="shrink-0 font-semibold text-[var(--azul)]">
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

          {/* Coluna direita: valores, pagamento, leiloeiro */}
          <aside className="space-y-6">
            <section className="rounded-md bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-neutral-500">{l.lance_atual != null ? "Lance atual" : l.lance_2 != null ? "2ª praça" : "Lance inicial"}</p>
              <p className="text-3xl font-semibold">{l.valor != null ? formatarReais(l.valor) : "A definir"}</p>
              {l.valorDe && (
                <p className="text-sm text-neutral-500">
                  1ª praça <span className="line-through">{formatarReais(l.valorDe)}</span>
                  {l.descontoPct ? <span className="ml-2 rounded-sm bg-[var(--verde)] px-1.5 py-0.5 text-xs font-semibold text-white">{l.descontoPct}% OFF</span> : null}
                </p>
              )}
              <dl className="mt-4 space-y-2 text-sm">
                {l.praca1 && <Linha rotulo="1ª praça" valor={formatarDataHora(l.praca1)} />}
                {l.praca2 && <Linha rotulo="2ª praça" valor={formatarDataHora(l.praca2)} />}
                <Linha rotulo="Próximo encerramento" valor={l.encerra_em ? formatarDataHora(l.encerra_em) : "a confirmar"} destaque />
                {l.lances != null && <Linha rotulo="Lances" valor={String(l.lances)} />}
                {l.visitas != null && <Linha rotulo="Visitas" valor={formatarMilhar(l.visitas)} />}
              </dl>
            </section>

            <section className="rounded-md bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold">Pagamento</h2>
              {l.parcelavel ? (
                <ul className="mt-2 space-y-1 text-sm text-neutral-700">
                  <li>✅ Leilão judicial: admite parcelamento</li>
                  <li>Entrada de <strong>25%</strong> e saldo em até <strong>30 parcelas</strong></li>
                  <li>Comissão do leiloeiro: normalmente 5%</li>
                  <li className="text-xs text-neutral-500">Confirme as condições no edital: cada juízo define correção e garantia.</li>
                </ul>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-neutral-700">
                  <li>Pagamento à vista{l.financiavel ? ` · ${l.financiavel.toLowerCase()}` : ""}</li>
                  {l.maxParcelas ? <li>Condição do leiloeiro: entrada {l.entradaMinPct ?? "—"}% e até {l.maxParcelas}x</li> : null}
                  <li className="text-xs text-neutral-500">Leilão extrajudicial: taxas e prazos conforme o leiloeiro.</li>
                </ul>
              )}
            </section>

            <section className="rounded-md border-2 border-[var(--verde)] bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 7.5-2" /></svg>
                Leiloeiro
              </h2>
              <p className="mt-2 text-lg font-bold">{l.leiloeiro}</p>
              {l.leiloeiroNome && <p className="text-sm text-neutral-600">{l.leiloeiroNome}</p>}
              {l.plataforma && <p className="text-sm text-neutral-600">Plataforma: {l.plataforma}</p>}
              {l.comitente && <p className="text-sm text-neutral-600">Comitente (vendedor): {l.comitente}</p>}
              {urlLeiloeiro && (
                <a href={urlLeiloeiro} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-sm bg-[var(--azul)] py-2.5 text-sm font-semibold text-white hover:bg-[#2968c8]">
                  Abrir lote no site do leiloeiro ↗
                </a>
              )}
              {l.paginaLeilao && (
                <a href={l.paginaLeilao} target="_blank" rel="noopener noreferrer" className="mt-2 block text-center text-sm font-semibold text-[var(--azul)]">
                  Página do leilão (edital e regras) ↗
                </a>
              )}
              <p className="mt-3 text-xs text-neutral-500">O lance é dado no site do leiloeiro. Nós não intermediamos pagamentos.</p>
            </section>
          </aside>
        </div>
      </main>
      <Rodape />
    </>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{rotulo}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-neutral-600">{rotulo}</dt>
      <dd className={destaque ? "font-semibold text-[var(--verde)]" : "font-medium"}>{valor}</dd>
    </div>
  );
}
