import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Nome do cookie que lembra "onboarding concluído" (cache; a verdade é `profiles.onboarding_done_at`). */
export const COOKIE_ONBOARDING = "vsj_onb";

export interface OnboardingPublico {
  titulo: string;
  texto: string;
  video_url: string;
  concluido: boolean;
}

export interface OnboardingAdmin {
  titulo: string;
  texto: string;
  video_url: string;
  palavras: [string, string];
}

export async function onboardingPublico(): Promise<OnboardingPublico> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("onboarding_publico");
  const v = (data ?? {}) as Partial<OnboardingPublico>;
  return { titulo: v.titulo ?? "", texto: v.texto ?? "", video_url: v.video_url ?? "", concluido: v.concluido === true };
}

export async function onboardingAdmin(): Promise<OnboardingAdmin | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_onboarding");
  if (!data) return null;
  const v = data as Partial<OnboardingAdmin>;
  const p = Array.isArray(v.palavras) ? v.palavras : [];
  return { titulo: v.titulo ?? "", texto: v.texto ?? "", video_url: v.video_url ?? "", palavras: [p[0] ?? "", p[1] ?? ""] };
}

/** Confere as duas palavras na RPC (as palavras certas nunca vêm ao servidor web). */
export async function concluirOnboarding(p1: string, p2: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("concluir_onboarding", { p1, p2 });
  if (error) throw new Error(`concluir_onboarding: ${error.message}`);
  return data === true;
}

export type Embed = { tipo: "iframe"; src: string } | { tipo: "video"; src: string } | { tipo: "nenhum" };

/** Converte a URL colada pelo admin (YouTube, Vimeo, .mp4) no que o player precisa. */
export function embedDe(url: string): Embed {
  const u = url.trim();
  if (!u) return { tipo: "nenhum" };
  const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { tipo: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { tipo: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm|m3u8)(\?|$)/i.test(u)) return { tipo: "video", src: u };
  if (/^https?:\/\//.test(u)) return { tipo: "iframe", src: u };
  return { tipo: "nenhum" };
}
