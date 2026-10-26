import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { usuarioAtual } from "@/lib/auth";
import { carteira } from "@/lib/creditos";
import { formatarDataHora, formatarReais } from "@/lib/formatar";
import { buscarPorId } from "@/lib/leiloes/repositorio";
import { createClient } from "@/lib/supabase/server";
import { reprocessarAnalise } from "./actions";

export const metadata: Metadata = { title: "Análises", robots: { index: false } };
export const maxDuration = 300;

const STATUS: Record<string, { rotulo: string; cor: string }> = {
  aguardando: { rotulo: "Na fila", cor: "bg-neutral-100 text-neutral-700" },
  processando: { rotulo: "Analisando…", cor: "bg-blue-50 text-blue-700" },
  disponivel: { rotulo: "Disponível", cor: "bg-green-50 text-green-700" },
  erro: { rotulo: "Falhou", cor: "bg-red-50 text-red-700" },
};

const VEREDITO: Record<string, string> = { boa_oportunidade: "BOA OPORTUNIDADE", neutra: "NEUTRA", evitar: "EVITAR" };

export default async function Analises() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login?next=/analises");
  const supabase = await createClient();
  const [cart, { data }] = await Promise.all([
    carteira(),
    supabase.from("analyses").select("id, auction_id, status, pedido_em, concluida_em, erro, resultado").order("pedido_em", { ascending: false }),
  ]);
  const linhas = await Promise.all(
    (data ?? []).map(async (a) => ({ ...a, leilao: await buscarPorId(a.auction_id as string) })),
  );
  const premium = cart.analisesLimite > 0;

  return (
    <>
      <Cabecalho usuario={usuario} carteira={cart} />
      <main className="mx-auto max-w-[1200px] px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-6 text-sm">
          <Link href="/busca" className="pb-1 text-neutral-600 hover:text-neutral-900">Buscar</Link>
          <Link href="/desbloqueados" className="pb-1 text-neutral-600 hover:text-neutral-900">Desbloqueados</Link>
          <span className="border-b-2 border-[var(--azul)] pb-1 font-semibold">Análises</span>
          <span className="ml-auto text-neutral-600">
            {premium ? (
              <>Análises do plano: <strong className="text-neutral-900">{cart.analisesUsadas}/{cart.analisesLimite}</strong> usadas este mês</>
            ) : (
              <>Análises são do <strong>VSJ Premium</strong></>
            )}
          </span>
        </div>

        {!premium && (
          <div className="mb-6 rounded-md border border-[var(--azul)]/30 bg-white p-5 shadow-sm">
            <p className="font-semibold">Peça a análise de qualquer leilão com o VSJ Premium</p>
            <p className="mt-1 text-sm text-neutral-600">
              Nossa IA lê o edital e os documentos, aponta as pegadinhas, abre as oportunidades, monta cenários de risco e diz até onde vale ir no lance. O Premium também tem busca ilimitada, tabela FIPE e valor de mercado em cada ficha.
            </p>
            <p className="mt-3 text-sm font-semibold text-[var(--azul)]">Fale com a gente no WhatsApp para migrar de plano.</p>
          </div>
        )}

        {linhas.length ? (
          <div className="overflow-hidden rounded-md bg-white shadow-sm">
            <ul className="divide-y divide-neutral-100">
              {linhas.map((a) => {
                const st = STATUS[a.status as string] ?? STATUS.aguardando;
                const r = a.resultado as { veredito?: string; lance_maximo?: { valor?: number | null } } | null;
                return (
                  <li key={a.id as string} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <Link href={a.status === "disponivel" ? `/analises/${a.id}` : `/leilao/${a.auction_id}`} className="relative h-24 w-full shrink-0 overflow-hidden rounded-sm bg-neutral-100 sm:h-20 sm:w-28">
                      {a.leilao?.fotos[0] ? (
                        <Image src={a.leilao.fotos[0]} alt="" fill sizes="112px" className="object-cover" unoptimized />
                      ) : (
                        <span className="grid h-full place-items-center text-[10px] text-neutral-400">sem foto</span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.leilao?.titulo ?? "Leilão removido"}</p>
                      <p className="text-xs text-neutral-500">
                        Pedida em {formatarDataHora(a.pedido_em as string)}
                        {a.leilao?.cidade && ` · ${a.leilao.cidade}/${a.leilao.uf ?? ""}`}
                        {a.leilao?.valor != null && ` · lance ${formatarReais(a.leilao.valor)}`}
                      </p>
                      {a.status === "erro" && a.erro && <p className="mt-1 text-xs text-red-700">{String(a.erro).slice(0, 160)}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {r?.veredito && (
                        <span className={`rounded-sm px-2 py-0.5 text-[11px] font-bold tracking-wide ${r.veredito === "boa_oportunidade" ? "bg-[var(--verde)] text-white" : r.veredito === "evitar" ? "bg-red-600 text-white" : "bg-neutral-200 text-neutral-800"}`}>
                          {VEREDITO[r.veredito]}
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cor}`}>{st.rotulo}</span>
                      {a.status === "disponivel" ? (
                        <Link href={`/analises/${a.id}`} className="rounded-sm bg-[var(--azul)] px-3 py-1.5 text-sm font-semibold text-white">Ver análise</Link>
                      ) : a.status === "erro" ? (
                        <form action={reprocessarAnalise}>
                          <input type="hidden" name="id" value={a.id as string} />
                          <input type="hidden" name="voltar" value="/analises" />
                          <button className="rounded-sm border border-[var(--azul)] px-3 py-1.5 text-sm font-semibold text-[var(--azul)]">Tentar de novo</button>
                        </form>
                      ) : (
                        <Link href={`/analises/${a.id}`} className="rounded-sm border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700">Acompanhar</Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="rounded-md bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold">Nenhuma análise pedida ainda</p>
            <p className="mt-1 text-sm text-neutral-600">Abra a ficha de um leilão desbloqueado e clique em “Pedir análise”.</p>
            <Link href="/desbloqueados" className="mt-4 inline-block text-sm font-semibold text-[var(--azul)]">Ir para Desbloqueados</Link>
          </div>
        )}
      </main>
      <Rodape />
    </>
  );
}
