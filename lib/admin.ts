import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface UsuarioAdmin {
  id: string;
  email: string;
  nome: string | null;
  plano: string;
  plano_expira_em: string | null;
  is_admin: boolean;
  saldo: number;
  buscas_mes: number;
  analises_mes: number;
  criado_em: string;
  ultimo_login: string | null;
}

export interface ResumoAdmin {
  lotes_ativos: number;
  lotes_removidos: number;
  usuarios: number;
  premium: number;
  buscas_hoje: number;
  desbloqueios_hoje: number;
  analises_pendentes: number;
  analises_erro: number;
  creditos_em_circulacao: number;
}

export interface AnaliseAdmin {
  id: string;
  status: "aguardando" | "processando" | "disponivel" | "erro";
  pedido_em: string;
  concluida_em: string | null;
  erro: string | null;
  modelo: string | null;
  tokens: number | null;
  email: string;
  auction_id: string;
  titulo: string;
}

export interface FonteAdmin {
  id: string;
  plataforma: string;
  base_url: string | null;
  ativo: boolean;
  ultima_coleta: string | null;
  ultimo_erro: string | null;
}

export async function resumoAdmin(): Promise<ResumoAdmin | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_resumo");
  return (data as ResumoAdmin | null) ?? null;
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_listar_usuarios");
  return (data as UsuarioAdmin[] | null) ?? [];
}

export async function listarAnalisesAdmin(): Promise<AnaliseAdmin[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_listar_analises");
  return (data as AnaliseAdmin[] | null) ?? [];
}

export async function listarFontes(): Promise<FonteAdmin[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_fontes");
  return (data as FonteAdmin[] | null) ?? [];
}
