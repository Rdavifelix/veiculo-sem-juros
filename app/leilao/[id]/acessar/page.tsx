import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { carteira, desbloquear, idsDesbloqueados } from "@/lib/creditos";
import { buscarPorId } from "@/lib/leiloes/repositorio";
import { Cabecalho } from "@/components/Cabecalho";
import { formatarReais } from "@/lib/formatar";

export const metadata: Metadata = { title: "Acessar leilão", robots: { index: false } };

async function confirmar(form: FormData) {
  "use server";
  const id = String(form.get("id"));
  const r = await desbloquear(id);
  if ("url" in r) redirect(r.url);
  redirect(`/leilao/${id}/acessar?erro=${r.erro}`);
}

export default async function Acessar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const { erro } = await searchParams;
  const usuario = await usuarioAtual();
  if (!usuario) redirect(`/login?next=/leilao/${id}/acessar`);

  // Já desbloqueado → vai direto, sem cobrar (a RPC também não cobra).
  const desbloqueados = await idsDesbloqueados();
  if (desbloqueados.has(id)) {
    const r = await desbloquear(id);
    if ("url" in r) redirect(r.url);
  }

  const [leilao, cart] = await Promise.all([buscarPorId(id), carteira()]);
  if (!leilao) redirect("/busca");

  return (
    <>
      <Cabecalho usuario={usuario} carteira={cart} />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-md bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Acessar este leilão?</h1>
          <p className="mt-2 text-sm text-neutral-700">
            Ao confirmar, vamos gastar <strong>1 crédito</strong> para liberar o link deste leilão para você. O link fica disponível para sempre em{" "}
            <Link href="/desbloqueados" className="text-[var(--azul)]">Desbloqueados</Link>.
          </p>
          <div className="mt-4 rounded-sm bg-neutral-50 p-3 text-sm">
            <p className="font-semibold">{leilao.titulo}</p>
            <p className="text-neutral-600">
              {[leilao.cidade && `${leilao.cidade}/${leilao.uf ?? ""}`, leilao.valor != null && formatarReais(leilao.valor)].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-1 text-xs text-neutral-500">O nome do leiloeiro e o link do lote aparecem depois da confirmação.</p>
          </div>
          <p className="mt-4 text-sm text-neutral-600">
            Saldo atual: <strong>{cart.saldo}</strong> → depois: <strong>{Math.max(0, cart.saldo - 1)}</strong>
          </p>
          {erro === "sem_creditos" && <p className="mt-3 rounded-sm bg-red-50 px-3 py-2 text-sm text-red-700">Você está sem créditos. Recarregue para continuar.</p>}
          <form action={confirmar} className="mt-5 flex gap-3">
            <input type="hidden" name="id" value={id} />
            <Link href="/busca" className="flex-1 rounded-sm border border-neutral-300 py-2.5 text-center text-sm font-semibold text-neutral-700">Cancelar</Link>
            <button type="submit" disabled={cart.saldo < 1} className="flex-1 rounded-sm bg-[var(--azul)] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              Gastar 1 crédito
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
