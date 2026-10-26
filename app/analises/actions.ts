"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { processarAnalise } from "@/lib/ia/analise";
import { createClient } from "@/lib/supabase/server";

/** Premium: pede a análise de um lote desbloqueado. A IA roda depois da resposta (after) e a página mostra o status. */
export async function solicitarAnalise(form: FormData) {
  if (!(await usuarioAtual())) redirect("/login?next=/analises");
  const auctionId = String(form.get("auction_id") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("solicitar_analise", { p_auction: auctionId });
  if (error) {
    const motivo = /sem análises/.test(error.message) ? "plano" : /esgotada/.test(error.message) ? "cota" : /desbloqueie/.test(error.message) ? "desbloqueio" : "erro";
    redirect(`/leilao/${auctionId}?analise=${motivo}`);
  }
  const id = data as string;
  after(async () => {
    await processarAnalise(id);
  });
  redirect(`/analises/${id}`);
}

/** Dono ou admin: roda de novo uma análise que deu erro (ou ficou presa em aguardando). */
export async function reprocessarAnalise(form: FormData) {
  if (!(await usuarioAtual())) redirect("/login");
  const id = String(form.get("id") ?? "");
  const voltar = String(form.get("voltar") ?? `/analises/${id}`);
  after(async () => {
    await processarAnalise(id);
  });
  redirect(voltar);
}
