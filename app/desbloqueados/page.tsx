import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { CardLeilao } from "@/components/CardLeilao";
import { Rodape } from "@/components/Rodape";
import { usuarioAtual } from "@/lib/auth";
import { carteira } from "@/lib/creditos";
import { formatarDataHora } from "@/lib/formatar";
import { buscarPorId } from "@/lib/leiloes/repositorio";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Desbloqueados", robots: { index: false } };

export default async function Desbloqueados() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login?next=/desbloqueados");
  const supabase = await createClient();
  const [cart, { data: unlocks }] = await Promise.all([
    carteira(),
    supabase.from("unlocks").select("auction_id, created_at").order("created_at", { ascending: false }),
  ]);
  const linhas = await Promise.all(
    (unlocks ?? []).map(async (u) => ({ id: u.auction_id as string, em: u.created_at as string, leilao: await buscarPorId(u.auction_id as string) })),
  );
  const ativos = linhas.filter((l) => l.leilao);
  const removidos = linhas.filter((l) => !l.leilao);

  return (
    <>
      <Cabecalho usuario={usuario} carteira={cart} />
      <main className="mx-auto max-w-[1200px] px-4 py-6">
        <div className="mb-6 flex items-center gap-6 text-sm">
          <Link href="/busca" className="pb-1 text-neutral-600 hover:text-neutral-900">Buscar</Link>
          <span className="border-b-2 border-[var(--azul)] pb-1 font-semibold">Desbloqueados</span>
          <span className="ml-auto flex items-center gap-1.5 text-neutral-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#e53935" aria-hidden>
              <path d="M12 21s-7.5-4.6-9.5-9.3C1 7.9 3.6 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 6 3.4 4.5 7.2C19.5 16.4 12 21 12 21z" />
            </svg>
            {linhas.length} {linhas.length === 1 ? "leilão desbloqueado" : "leilões desbloqueados"} · abrir de novo é grátis
          </span>
        </div>

        {linhas.length ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ativos.map(({ id, em, leilao }) => (
                <CardLeilao key={id} leilao={leilao!} logado desbloqueado legenda={`Desbloqueado em ${formatarDataHora(em)}`} />
              ))}
              {removidos.map(({ id, em }) => (
                <article key={id} className="flex flex-col rounded-md border border-dashed border-neutral-300 bg-white/60 p-4 text-sm text-neutral-500">
                  <p className="text-xs">Desbloqueado em {formatarDataHora(em)}</p>
                  <p className="mt-2 font-semibold uppercase tracking-wide text-neutral-600">Leilão removido</p>
                  <p className="mt-1">O leiloeiro tirou este lote do ar. Link indisponível.</p>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-md bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold">Nenhum leilão desbloqueado ainda</p>
            <p className="mt-1 text-sm text-neutral-600">Quando você gastar 1 crédito para acessar um leilão, ele aparece aqui com um coração e fica seu para sempre.</p>
            <Link href="/busca" className="mt-4 inline-block text-sm font-semibold text-[var(--azul)]">Ir para a busca</Link>
          </div>
        )}
      </main>
      <Rodape />
    </>
  );
}
