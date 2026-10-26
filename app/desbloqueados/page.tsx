import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { usuarioAtual } from "@/lib/auth";
import { carteira } from "@/lib/creditos";
import { formatarDataHora, formatarReais } from "@/lib/formatar";
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

  return (
    <>
      <Cabecalho usuario={usuario} carteira={cart} />
      <main className="mx-auto max-w-[1200px] px-4 py-6">
        <div className="mb-6 flex items-center gap-6 text-sm">
          <Link href="/busca" className="pb-1 text-neutral-600 hover:text-neutral-900">Buscar</Link>
          <span className="border-b-2 border-[var(--azul)] pb-1 font-semibold">Desbloqueados</span>
        </div>

        {linhas.length ? (
          <div className="overflow-x-auto rounded-md bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Desbloqueado em</th>
                  <th className="px-4 py-3">Veículo</th>
                  <th className="px-4 py-3">Cidade</th>
                  <th className="px-4 py-3">Lance</th>
                  <th className="px-4 py-3">Encerra</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {linhas.map(({ id, em, leilao }) => (
                  <tr key={id}>
                    <td className="px-4 py-3 text-neutral-600">{formatarDataHora(em)}</td>
                    <td className="px-4 py-3 font-medium">{leilao ? leilao.titulo : <span className="text-neutral-500">LEILÃO REMOVIDO</span>}</td>
                    <td className="px-4 py-3 text-neutral-600">{leilao ? [leilao.cidade, leilao.uf].filter(Boolean).join("/") : "—"}</td>
                    <td className="px-4 py-3">{leilao ? formatarReais(leilao.valor) : "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{leilao ? formatarDataHora(leilao.encerra_em) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {leilao ? (
                        <Link href={`/leilao/${id}/acessar`} className="font-semibold text-[var(--azul)]">Ver leilão</Link>
                      ) : (
                        <span className="text-xs text-neutral-400">Link indisponível</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-md bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold">Nenhum leilão desbloqueado ainda</p>
            <p className="mt-1 text-sm text-neutral-600">Quando você gastar 1 crédito para acessar um leilão, o link fica guardado aqui para sempre.</p>
            <Link href="/busca" className="mt-4 inline-block text-sm font-semibold text-[var(--azul)]">Ir para a busca</Link>
          </div>
        )}
      </main>
      <Rodape />
    </>
  );
}
