"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { COOKIE_ONBOARDING, concluirOnboarding } from "@/lib/onboarding";

function destinoSeguro(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/onboarding") ? next : "/busca";
}

/** Confere as duas palavras-chave na RPC; se baterem, marca o perfil e libera a plataforma. */
export async function concluir(_estado: { erro?: string } | undefined, form: FormData) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login?next=/onboarding");
  const p1 = String(form.get("palavra1") ?? "").trim();
  const p2 = String(form.get("palavra2") ?? "").trim();
  const next = destinoSeguro(form.get("next"));
  if (!p1 || !p2) return { erro: "Informe as duas palavras-chave ditas no vídeo." };

  const ok = await concluirOnboarding(p1, p2);
  if (!ok) return { erro: "As palavras não conferem. Assista ao vídeo de novo e preste atenção nas duas palavras-chave." };

  (await cookies()).set(COOKIE_ONBOARDING, usuario.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  redirect(next);
}
