import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { FormularioLogin } from "./FormularioLogin";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : sp.leilao ? `/leilao/${sp.leilao}/acessar` : "/busca";
  if (await usuarioAtual()) redirect(next);

  return (
    <main className="min-h-screen bg-[var(--fundo)]">
      <div className="bg-[var(--amarelo)] px-4 py-3">
        <Link href="/" className="mx-auto block max-w-[1200px] text-lg font-bold">
          Veículo <span className="font-light">Sem Juros</span>
        </Link>
      </div>
      <div className="mx-auto mt-16 max-w-sm rounded-md bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <p className="mt-1 text-sm text-neutral-600">O acesso é liberado após a compra do plano. Use o e-mail cadastrado na compra.</p>
        <FormularioLogin next={next} />
      </div>
    </main>
  );
}
