import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { usuarioAtual } from "@/lib/auth";
import { carteira } from "@/lib/creditos";
import { capitalizarTitulo, formatarDataHora, formatarReais } from "@/lib/formatar";
import { listarParticipacoes, type ParticipacaoComLeilao } from "@/lib/participacoes";
import { desmarcarParticipacao } from "@/app/analises/actions";

export const metadata: Metadata = { title: "Agenda de leilões", robots: { index: false } };

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const chaveDia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Link "Adicionar ao Google Agenda" (1 hora a partir do encerramento). */
function linkGoogle(p: ParticipacaoComLeilao) {
  if (!p.leilao?.encerra_em) return null;
  const ini = new Date(p.leilao.encerra_em);
  const fim = new Date(ini.getTime() + 3_600_000);
  const z = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `Leilão: ${capitalizarTitulo(p.leilao.titulo)}`,
    dates: `${z(ini)}/${z(fim)}`,
    details: [p.lance_maximo != null && `Meu lance máximo: ${formatarReais(p.lance_maximo)}`, p.observacao, `Leiloeiro: ${p.leilao.leiloeiro}`].filter(Boolean).join("\n"),
    location: [p.leilao.cidade, p.leilao.uf].filter(Boolean).join("/"),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export default async function Agenda({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login?next=/agenda");
  const { m } = await searchParams;
  const [cart, participacoes] = await Promise.all([carteira(), listarParticipacoes()]);
  const premium = cart.plano.analises_mes > 0 || cart.admin;

  const hoje = new Date();
  const [anoQ, mesQ] = (m ?? "").split("-").map(Number);
  const base = anoQ && mesQ ? new Date(anoQ, mesQ - 1, 1) : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ano = base.getFullYear();
  const mes = base.getMonth();
  const anterior = new Date(ano, mes - 1, 1);
  const proximo = new Date(ano, mes + 1, 1);
  const paraQuery = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  // Eventos por dia (data de encerramento do lote).
  const porDia = new Map<string, ParticipacaoComLeilao[]>();
  for (const p of participacoes) {
    if (!p.leilao?.encerra_em) continue;
    const k = chaveDia(new Date(p.leilao.encerra_em));
    porDia.set(k, [...(porDia.get(k) ?? []), p]);
  }
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const celulas: (Date | null)[] = [...Array(primeiroDiaSemana).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => new Date(ano, mes, i + 1))];
  while (celulas.length % 7) celulas.push(null);
  const chaveHoje = chaveDia(hoje);

  const futuros = participacoes
    .filter((p) => p.leilao?.encerra_em && new Date(p.leilao.encerra_em) >= hoje)
    .sort((a, b) => new Date(a.leilao!.encerra_em!).getTime() - new Date(b.leilao!.encerra_em!).getTime());
  const semData = participacoes.filter((p) => !p.leilao?.encerra_em);
  const passados = participacoes.filter((p) => p.leilao?.encerra_em && new Date(p.leilao.encerra_em) < hoje);

  return (
    <>
      <Cabecalho usuario={usuario} carteira={cart} />
      <main className="mx-auto max-w-[1200px] px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-6 text-sm">
          <Link href="/busca" className="pb-1 text-neutral-600 hover:text-neutral-900">Buscar</Link>
          <Link href="/desbloqueados" className="pb-1 text-neutral-600 hover:text-neutral-900">Desbloqueados</Link>
          <Link href="/analises" className="pb-1 text-neutral-600 hover:text-neutral-900">Análises</Link>
          <span className="border-b-2 border-[var(--azul)] pb-1 font-semibold">Agenda</span>
          <span className="ml-auto text-neutral-600">
            {participacoes.length} {participacoes.length === 1 ? "leilão marcado" : "leilões marcados"}
          </span>
        </div>

        {!premium ? (
          <div className="rounded-md border border-[var(--azul)]/30 bg-white p-5 shadow-sm">
            <p className="font-semibold">A Agenda é do VSJ Premium</p>
            <p className="mt-1 text-sm text-neutral-600">
              Depois de cada análise você marca “vou participar” e o leilão entra no seu calendário, com data de encerramento, seu lance máximo e lembrete no Google Agenda.
            </p>
            <p className="mt-3 text-sm font-semibold text-[var(--azul)]">Fale com a gente no WhatsApp para migrar de plano.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* Calendário */}
            <section className="min-w-0 rounded-md bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between">
                <Link href={`/agenda?m=${paraQuery(anterior)}`} className="grid h-10 w-10 place-items-center rounded-full hover:bg-neutral-100" aria-label="Mês anterior">‹</Link>
                <h1 className="text-lg font-semibold"><span className="capitalize">{MESES[mes]}</span> de {ano}</h1>
                <Link href={`/agenda?m=${paraQuery(proximo)}`} className="grid h-10 w-10 place-items-center rounded-full hover:bg-neutral-100" aria-label="Próximo mês">›</Link>
              </div>
              <div className="mt-4 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                {DIAS.map((d) => <div key={d} className="py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-sm bg-neutral-200">
                {celulas.map((d, i) => {
                  if (!d) return <div key={`v${i}`} className="min-h-[64px] bg-neutral-50 sm:min-h-[96px]" />;
                  const k = chaveDia(d);
                  const eventos = porDia.get(k) ?? [];
                  const ehHoje = k === chaveHoje;
                  return (
                    <div key={k} className={`min-h-[64px] min-w-0 overflow-hidden bg-white p-1 sm:min-h-[96px] sm:p-1.5 ${d < hoje && !ehHoje ? "text-neutral-400" : ""}`}>
                      <span className={`inline-grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${ehHoje ? "bg-[var(--azul)] text-white" : ""}`}>{d.getDate()}</span>
                      <div className="mt-0.5 space-y-0.5">
                        {eventos.map((p) => (
                          <Link
                            key={p.auction_id}
                            href={`/leilao/${p.auction_id}`}
                            title={`${capitalizarTitulo(p.leilao!.titulo)} · ${formatarDataHora(p.leilao!.encerra_em)}`}
                            className="block truncate rounded-sm bg-[var(--amarelo)] px-1 py-0.5 text-[10px] font-semibold leading-tight text-neutral-900 hover:brightness-95 sm:text-[11px]"
                          >
                            <span className="hidden sm:inline">{formatarDataHora(p.leilao!.encerra_em).slice(-5)} · </span>
                            {capitalizarTitulo(p.leilao!.titulo)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {semData.length > 0 && (
                <p className="mt-3 text-xs text-neutral-500">
                  {semData.length} {semData.length === 1 ? "leilão marcado sem data de encerramento" : "leilões marcados sem data de encerramento"} (aparecem só na lista ao lado).
                </p>
              )}
            </section>

            {/* Lista dos próximos */}
            <aside className="min-w-0 space-y-4">
              <section className="rounded-md bg-white p-4 shadow-sm sm:p-5">
                <h2 className="text-base font-semibold">Próximos leilões</h2>
                {futuros.length === 0 && semData.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-600">
                    Nenhum leilão marcado. Abra uma <Link href="/analises" className="font-semibold text-[var(--azul)]">análise</Link> e clique em “Vou participar”.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-neutral-100">
                    {[...futuros, ...semData].map((p) => <ItemAgenda key={p.auction_id} p={p} />)}
                  </ul>
                )}
              </section>
              {passados.length > 0 && (
                <section className="rounded-md bg-white p-4 shadow-sm sm:p-5">
                  <h2 className="text-base font-semibold text-neutral-600">Já encerrados</h2>
                  <ul className="mt-3 divide-y divide-neutral-100 opacity-70">
                    {passados.map((p) => <ItemAgenda key={p.auction_id} p={p} />)}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        )}
      </main>
      <Rodape />
    </>
  );
}

function ItemAgenda({ p }: { p: ParticipacaoComLeilao }) {
  const l = p.leilao;
  const google = linkGoogle(p);
  return (
    <li className="flex gap-3 py-3">
      <Link href={`/leilao/${p.auction_id}`} className="relative h-16 w-20 shrink-0 overflow-hidden rounded-sm bg-neutral-100">
        {l?.fotos[0] ? <Image src={l.fotos[0]} alt="" fill sizes="80px" className="object-cover" unoptimized /> : <span className="grid h-full place-items-center text-[10px] text-neutral-400">sem foto</span>}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/leilao/${p.auction_id}`} className="line-clamp-2 text-sm font-medium leading-snug hover:text-[var(--azul)]">{l ? capitalizarTitulo(l.titulo) : "Leilão removido da vitrine"}</Link>
        <p className="mt-0.5 text-xs text-neutral-600">
          {l?.encerra_em ? <strong className="text-neutral-900">Encerra {formatarDataHora(l.encerra_em)}</strong> : "Data a confirmar"}
          {l?.valor != null && ` · lance ${formatarReais(l.valor)}`}
        </p>
        <p className="text-xs text-neutral-600">
          {p.lance_maximo != null ? <>Meu teto: <strong className="text-[var(--verde)]">{formatarReais(p.lance_maximo)}</strong></> : "Sem teto definido"}
          {p.observacao && ` · ${p.observacao}`}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
          {google && <a href={google} target="_blank" rel="noopener noreferrer" className="text-[var(--azul)]">Google Agenda ↗</a>}
          <form action={desmarcarParticipacao}>
            <input type="hidden" name="auction_id" value={p.auction_id} />
            <input type="hidden" name="voltar" value="/agenda" />
            <button className="text-neutral-500 hover:text-red-700">Remover</button>
          </form>
        </div>
      </div>
    </li>
  );
}
