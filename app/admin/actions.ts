"use server";

import { redirect } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { usuarioAtual } from "@/lib/auth";
import { ehAdmin } from "@/lib/plano";
import { createClient } from "@/lib/supabase/server";

async function exigirAdmin() {
  if (!(await usuarioAtual())) redirect("/login?next=/admin");
  if (!(await ehAdmin())) redirect("/busca");
}

function voltar(aba: string, msg: string) {
  redirect(`/admin?aba=${aba}&msg=${encodeURIComponent(msg)}`);
}

export async function definirPlano(form: FormData) {
  await exigirAdmin();
  const supabase = await createClient();
  const expira = String(form.get("expira") ?? "");
  const { error } = await supabase.rpc("admin_definir_plano", {
    p_user: String(form.get("user_id")),
    p_plano: String(form.get("plano")),
    p_expira: expira ? new Date(expira).toISOString() : null,
  });
  voltar("usuarios", error ? `Erro: ${error.message}` : "Plano atualizado.");
}

export async function concederCreditos(form: FormData) {
  await exigirAdmin();
  const supabase = await createClient();
  const qtd = Number(form.get("qtd"));
  if (!qtd) voltar("usuarios", "Informe a quantidade (positiva para crédito, negativa para estorno).");
  const { data, error } = await supabase.rpc("admin_conceder_creditos", {
    p_user: String(form.get("user_id")),
    p_qtd: qtd,
    p_motivo: qtd > 0 ? String(form.get("motivo") ?? "bonus") : "estorno",
    p_ref: String(form.get("ref") ?? "admin"),
  });
  voltar("usuarios", error ? `Erro: ${error.message}` : `Saldo agora: ${data}.`);
}

export async function definirAdmin(form: FormData) {
  await exigirAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_definir_admin", { p_user: String(form.get("user_id")), p_admin: form.get("admin") === "true" });
  voltar("usuarios", error ? `Erro: ${error.message}` : "Permissão atualizada.");
}

/**
 * Cria a conta (acesso vendido por fora). Precisa de SUPABASE_SERVICE_ROLE_KEY no servidor; sem ela,
 * orienta a criar pelo painel do Supabase. Envia o e-mail de definição de senha.
 */
export async function criarUsuario(form: FormData) {
  await exigirAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const nome = String(form.get("nome") ?? "").trim();
  const plano = String(form.get("plano") ?? "vsj");
  const creditos = Number(form.get("creditos") ?? 0);
  if (!email) voltar("usuarios", "Informe o e-mail.");
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) voltar("usuarios", "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor: crie o usuário em Supabase → Authentication → Users e depois ajuste plano e créditos aqui.");

  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { nome } });
  if (error || !data.user) voltar("usuarios", `Erro ao criar: ${error?.message ?? "desconhecido"}`);
  const uid = data!.user!.id;
  const supabase = await createClient();
  if (plano !== "vsj") await supabase.rpc("admin_definir_plano", { p_user: uid, p_plano: plano, p_expira: null });
  if (creditos > 0) await supabase.rpc("admin_conceder_creditos", { p_user: uid, p_qtd: creditos, p_motivo: "bonus", p_ref: "boas-vindas" });
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await admin.auth.resetPasswordForEmail(email, { redirectTo: `${base}/login/nova-senha` });
  voltar("usuarios", `Conta criada para ${email}. Enviamos o e-mail para definir a senha.`);
}

/** Onboarding: vídeo, textos e as duas palavras-chave que liberam a plataforma. */
export async function definirOnboarding(form: FormData) {
  await exigirAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_definir_onboarding", {
    p_valor: {
      titulo: String(form.get("titulo") ?? "").trim(),
      texto: String(form.get("texto") ?? "").trim(),
      video_url: String(form.get("video_url") ?? "").trim(),
      palavras: [String(form.get("palavra1") ?? "").trim(), String(form.get("palavra2") ?? "").trim()],
    },
  });
  voltar("onboarding", error ? `Erro: ${error.message}` : "Onboarding atualizado. Quem ainda não concluiu já vê a nova versão.");
}

/** Faz um usuário passar pelo onboarding de novo (ex.: vídeo novo que todos precisam ver). */
export async function reiniciarOnboarding(form: FormData) {
  await exigirAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reiniciar_onboarding", { p_user: String(form.get("user_id")) });
  voltar("usuarios", error ? `Erro: ${error.message}` : "Onboarding reiniciado: na próxima página o usuário verá o vídeo de novo.");
}
