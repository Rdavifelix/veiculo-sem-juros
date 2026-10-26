"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { processarAnalise } from "@/lib/ia/analise";
import { desmarcarParticipacao as desmarcar, marcarParticipacao as marcar } from "@/lib/participacoes";
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

/** Depois da análise: "vou participar deste leilão" (vai para a Agenda). Lance máximo e observação são opcionais. */
export async function marcarParticipacao(form: FormData) {
  if (!(await usuarioAtual())) redirect("/login");
  const auctionId = String(form.get("auction_id") ?? "");
  const voltar = String(form.get("voltar") ?? "/agenda");
  const bruto = String(form.get("lance_maximo") ?? "").replace(/[^\d,.]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
  const lance = bruto ? Number(bruto) : null;
  const observacao = String(form.get("observacao") ?? "").trim() || null;
  const r = await marcar(auctionId, Number.isFinite(lance) ? lance : null, observacao);
  // Query antes do #: com só a âncora mudando, o Next não recarrega a página.
  const [caminho, hash] = voltar.split("#");
  const sep = caminho.includes("?") ? "&" : "?";
  revalidatePath(caminho.split("?")[0]);
  redirect(`${caminho}${sep}participar=${"ok" in r ? "ok" : r.erro}${hash ? `#${hash}` : ""}`);
}

export async function desmarcarParticipacao(form: FormData) {
  if (!(await usuarioAtual())) redirect("/login");
  const auctionId = String(form.get("auction_id") ?? "");
  const voltar = String(form.get("voltar") ?? "/agenda");
  await desmarcar(auctionId);
  const [caminho, hash] = voltar.split("#");
  revalidatePath(caminho.split("?")[0]);
  redirect(`${caminho}${caminho.includes("?") ? "&" : "?"}participar=removido${hash ? `#${hash}` : ""}`);
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
