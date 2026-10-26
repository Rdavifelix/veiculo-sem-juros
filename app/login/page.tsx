import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Entrar" };

export default function Login() {
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
        <form className="mt-6 space-y-4" action="/login">
          <label className="block text-sm">
            <span className="text-neutral-700">E-mail</span>
            <input name="email" type="email" className="mt-1 h-11 w-full rounded-sm border border-neutral-300 px-3 outline-none focus:border-[var(--azul)]" />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-700">Senha</span>
            <input name="senha" type="password" className="mt-1 h-11 w-full rounded-sm border border-neutral-300 px-3 outline-none focus:border-[var(--azul)]" />
          </label>
          <button type="button" className="h-11 w-full rounded-sm bg-[var(--azul)] font-semibold text-white" disabled title="Autenticação entra com o projeto Supabase">
            Entrar
          </button>
          <p className="text-center text-xs text-neutral-500">Esqueceu sua senha? · Ainda não tem acesso? Fale com a gente no WhatsApp.</p>
        </form>
      </div>
    </main>
  );
}
