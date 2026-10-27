"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function destinoSeguro(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/busca";
}

export async function entrar(_estado: { erro?: string } | undefined, form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const next = destinoSeguro(form.get("next"));
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    return { erro: error.message.includes("Invalid login") ? "E-mail ou senha incorretos." : "Não foi possível entrar agora. Tente de novo." };
  }
  // Gate de onboarding na 1ª entrada (o proxy também aplica, mas decidir aqui mantém a URL certa no navegador).
  const { data: perfil } = await supabase.from("profiles").select("onboarding_done_at").maybeSingle();
  if (!perfil?.onboarding_done_at) redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function pedirRedefinicao(_estado: { erro?: string; ok?: boolean } | undefined, form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) return { erro: "Informe o e-mail da sua conta." };
  const supabase = await createClient();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${base}/login/nova-senha` });
  if (error) return { erro: "Não foi possível enviar o e-mail agora." };
  return { ok: true };
}

export async function definirNovaSenha(_estado: { erro?: string } | undefined, form: FormData) {
  const senha = String(form.get("senha") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: "Link expirado. Peça uma nova redefinição." };
  redirect("/busca");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
