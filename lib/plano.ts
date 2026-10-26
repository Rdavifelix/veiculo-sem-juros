import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface Plano {
  id: string;
  nome: string;
  buscas_ilimitadas: boolean;
  analises_mes: number;
  fipe: boolean;
  mercado: boolean;
}

export const PLANO_PADRAO: Plano = { id: "vsj", nome: "VSJ (Veículo Sem Juros Padrão)", buscas_ilimitadas: false, analises_mes: 0, fipe: false, mercado: false };

/** Plano vigente do usuário logado (a RPC já aplica a expiração do Premium). */
export async function planoAtual(): Promise<Plano> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("plano_atual");
  const linha = (Array.isArray(data) ? data[0] : data) as Plano | null;
  return linha ?? PLANO_PADRAO;
}

export async function cotaAnalises(): Promise<{ usadas: number; limite: number }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("cota_analises");
  const linha = (Array.isArray(data) ? data[0] : data) as { usadas?: number; limite?: number } | null;
  return { usadas: linha?.usadas ?? 0, limite: linha?.limite ?? 0 };
}

export async function ehAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}
