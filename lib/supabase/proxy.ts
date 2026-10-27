import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_ONBOARDING = "vsj_onb";

/** Rotas que um usuário logado pode abrir antes de concluir o onboarding. */
function livreDeOnboarding(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/onboarding" ||
    pathname === "/conversa" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/termos") ||
    pathname.startsWith("/politica") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/")
  );
}

/**
 * Renova a sessão do Supabase a cada requisição e devolve os cookies atualizados.
 * Também aplica o gate de onboarding: logado sem concluir → `/onboarding`. O cookie `vsj_onb` (valor = id do
 * usuário) evita consultar o perfil a cada requisição; a verdade é `profiles.onboarding_done_at`.
 */
export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  // Sem projeto Supabase configurado (ex.: ambiente de desenvolvimento só com a semente), não há sessão a renovar.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return resposta;

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  // getUser() valida o token no servidor do Supabase (getSession() só lê o cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  if (!user || livreDeOnboarding(pathname) || request.method !== "GET") return resposta;
  if (request.cookies.get(COOKIE_ONBOARDING)?.value === user.id) return resposta;

  const { data: perfil } = await supabase.from("profiles").select("onboarding_done_at").eq("id", user.id).maybeSingle();
  if (perfil?.onboarding_done_at) {
    resposta.cookies.set(COOKIE_ONBOARDING, user.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
    return resposta;
  }

  const destino = request.nextUrl.clone();
  destino.pathname = "/onboarding";
  destino.search = `?next=${encodeURIComponent(pathname + search)}`;
  const redirecionar = NextResponse.redirect(destino);
  resposta.cookies.getAll().forEach((c) => redirecionar.cookies.set(c));
  return redirecionar;
}
