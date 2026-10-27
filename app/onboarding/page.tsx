import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sair } from "@/app/login/actions";
import { usuarioAtual } from "@/lib/auth";
import { embedDe, onboardingPublico } from "@/lib/onboarding";
import { FormularioOnboarding } from "./FormularioOnboarding";

export const metadata: Metadata = { title: "Bem-vindo", robots: { index: false } };

/**
 * Gate de onboarding (1ª entrada): vídeo + 2 palavras-chave → "Começar a usar a plataforma".
 * `?preview=1` deixa o admin ver a tela mesmo depois de concluir.
 */
export default async function Onboarding({ searchParams }: { searchParams: Promise<{ next?: string; preview?: string }> }) {
  const { next, preview } = await searchParams;
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login?next=/onboarding");
  const destino = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/onboarding") ? next : "/busca";
  const cfg = await onboardingPublico();
  if (cfg.concluido && !preview) redirect(destino);
  const video = embedDe(cfg.video_url);

  return (
    <main className="min-h-screen bg-[var(--fundo)]">
      <div className="bg-[var(--amarelo)] px-4 py-3">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <Link href="/" className="text-lg font-bold">
            Veículo <span className="font-light">Sem Juros</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-neutral-700 sm:inline">Olá, {usuario.nome.split(" ")[0]}</span>
            <form action={sair}>
              <button type="submit" className="rounded-sm border border-neutral-700/30 px-3 py-1.5 font-semibold hover:bg-white/50">Sair</button>
            </form>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[860px] px-4 py-8 sm:py-12">
        {preview && cfg.concluido && (
          <p className="mb-4 rounded-sm border border-[var(--azul)]/30 bg-blue-50 px-3 py-2 text-sm text-neutral-800">
            Pré-visualização do onboarding (você já concluiu). <Link href="/admin?aba=onboarding" className="font-semibold text-[var(--azul)]">Voltar ao admin</Link>
          </p>
        )}
        <section className="overflow-hidden rounded-md bg-white shadow-sm">
          <div className="relative aspect-video bg-neutral-900">
            {video.tipo === "iframe" && (
              <iframe
                src={video.src}
                title="Vídeo de boas-vindas"
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}
            {video.tipo === "video" && <video src={video.src} controls playsInline className="absolute inset-0 h-full w-full" />}
            {video.tipo === "nenhum" && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-neutral-300">
                O vídeo de boas-vindas ainda não foi configurado. O administrador define o link em Admin → Onboarding.
              </div>
            )}
          </div>
          <div className="p-5 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--azul)]">Primeiro acesso</p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">{cfg.titulo || "Bem-vindo ao Veículo Sem Juros"}</h1>
            {cfg.texto && <p className="mt-3 text-[15px] leading-relaxed text-neutral-700">{cfg.texto}</p>}
            <FormularioOnboarding next={destino} />
          </div>
        </section>
        <p className="mt-6 text-center text-xs text-neutral-500">
          Problemas com o vídeo ou com as palavras? Fale com a gente no WhatsApp.
        </p>
      </div>
    </main>
  );
}
