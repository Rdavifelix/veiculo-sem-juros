import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface Sessao {
  id: string;
  email: string;
  nome: string;
}

/** Usuário logado (ou null). Memoizado por requisição. */
export const usuarioAtual = cache(async (): Promise<Sessao | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle();
  return {
    id: user.id,
    email: user.email ?? "",
    nome: perfil?.nome ?? (user.user_metadata?.nome as string | undefined) ?? user.email?.split("@")[0] ?? "",
  };
});
