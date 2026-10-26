import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { reprocessarAnalise } from "@/app/analises/actions";
import { listarAnalisesAdmin, listarFontes, listarUsuarios, resumoAdmin } from "@/lib/admin";
import { usuarioAtual } from "@/lib/auth";
import { carteira } from "@/lib/creditos";
import { formatarDataHora, formatarMilhar } from "@/lib/formatar";
import { concederCreditos, criarUsuario, definirAdmin, definirPlano } from "./actions";

export const metadata: Metadata = { title: "Administração", robots: { index: false } };
export const maxDuration = 300;

const ABAS = [
  ["visao", "Visão geral"],
  ["usuarios", "Usuários"],
  ["analises", "Análises"],
  ["fontes", "Fontes de coleta"],
] as const;

export default async function Admin({ searchParams }: { searchParams: Promise<{ aba?: string; msg?: string }> }) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login?next=/admin");
  const cart = await carteira();
  if (!cart.admin) redirect("/busca");
  const { aba = "visao", msg } = await searchParams;

  const [resumo, usuarios, analises, fontes] = await Promise.all([
    resumoAdmin(),
    aba === "usuarios" ? listarUsuarios() : Promise.resolve([]),
    aba === "analises" ? listarAnalisesAdmin() : Promise.resolve([]),
    aba === "fontes" ? listarFontes() : Promise.resolve([]),
  ]);

  const campo = "h-9 rounded-sm border border-neutral-300 px-2 text-sm";
  const botao = "h-9 rounded-sm bg-[var(--azul)] px-3 text-sm font-semibold text-white";

  return (
    <>
      <Cabecalho usuario={usuario} carteira={cart} />
      <main className="mx-auto max-w-[1200px] px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h1 className="mr-4 text-2xl font-semibold">Administração</h1>
          {ABAS.map(([k, r]) => (
            <Link key={k} href={`/admin?aba=${k}`} className={`rounded-full px-3 py-1 text-sm ${aba === k ? "bg-[var(--azul)] font-semibold text-white" : "bg-white text-neutral-700 shadow-sm"}`}>
              {r}
            </Link>
          ))}
        </div>
        {msg && <p className="mb-4 rounded-sm border border-[var(--azul)]/30 bg-blue-50 px-3 py-2 text-sm text-neutral-800">{msg}</p>}

        {aba === "visao" && resumo && (
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {(
              [
                ["Lotes ativos", resumo.lotes_ativos],
                ["Lotes removidos", resumo.lotes_removidos],
                ["Usuários", resumo.usuarios],
                ["Premium", resumo.premium],
                ["Buscas hoje", resumo.buscas_hoje],
                ["Desbloqueios hoje", resumo.desbloqueios_hoje],
                ["Análises pendentes", resumo.analises_pendentes],
                ["Análises com erro", resumo.analises_erro],
                ["Créditos em circulação", resumo.creditos_em_circulacao],
              ] as const
            ).map(([r, v]) => (
              <div key={r} className="rounded-md bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-neutral-500">{r}</p>
                <p className="mt-1 text-2xl font-semibold">{formatarMilhar(v)}</p>
              </div>
            ))}
            <div className="col-span-full rounded-md bg-white p-4 text-sm text-neutral-700 shadow-sm">
              <p className="font-semibold">Planos</p>
              <ul className="mt-1 list-disc pl-5">
                <li><strong>VSJ</strong>: 1 crédito por busca com resultado, 1 por link desbloqueado. Sem análises.</li>
                <li><strong>VSJ Premium</strong>: buscas ilimitadas, FIPE e valor de mercado na ficha, 10 análises por IA por mês, aba Análises. Desbloqueio continua custando 1 crédito.</li>
              </ul>
              <p className="mt-2 text-xs text-neutral-500">
                Para a IA funcionar, o servidor precisa da variável ANTHROPIC_API_KEY. Status agora: {process.env.ANTHROPIC_API_KEY ? "configurada ✅" : "não configurada ❌"}. Criação de contas pelo painel exige SUPABASE_SERVICE_ROLE_KEY: {process.env.SUPABASE_SERVICE_ROLE_KEY ? "configurada ✅" : "não configurada ❌"}.
              </p>
            </div>
          </section>
        )}

        {aba === "usuarios" && (
          <section className="space-y-4">
            <form action={criarUsuario} className="flex flex-wrap items-end gap-2 rounded-md bg-white p-4 shadow-sm">
              <label className="text-xs">E-mail<br /><input name="email" type="email" required className={`${campo} w-64`} /></label>
              <label className="text-xs">Nome<br /><input name="nome" className={`${campo} w-44`} /></label>
              <label className="text-xs">Plano<br />
                <select name="plano" className={campo}><option value="vsj">VSJ</option><option value="premium">VSJ Premium</option></select>
              </label>
              <label className="text-xs">Créditos iniciais<br /><input name="creditos" type="number" defaultValue={10} className={`${campo} w-24`} /></label>
              <button className={botao}>Criar conta e enviar e-mail de senha</button>
            </form>

            <div className="overflow-x-auto rounded-md bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-3 py-2">Usuário</th><th className="px-3 py-2">Plano</th><th className="px-3 py-2">Saldo</th><th className="px-3 py-2">Mês</th><th className="px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 align-top">
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td className="px-3 py-3">
                        <p className="font-medium">{u.nome ?? "—"} {u.is_admin && <span className="ml-1 rounded-sm bg-neutral-800 px-1.5 py-px text-[10px] font-bold uppercase text-white">admin</span>}</p>
                        <p className="text-xs text-neutral-500">{u.email}</p>
                        <p className="text-xs text-neutral-400">desde {formatarDataHora(u.criado_em)}{u.ultimo_login && ` · último login ${formatarDataHora(u.ultimo_login)}`}</p>
                      </td>
                      <td className="px-3 py-3">
                        <form action={definirPlano} className="flex flex-wrap items-center gap-1">
                          <input type="hidden" name="user_id" value={u.id} />
                          <select name="plano" defaultValue={u.plano} className={campo}><option value="vsj">VSJ</option><option value="premium">Premium</option></select>
                          <input name="expira" type="date" defaultValue={u.plano_expira_em ? u.plano_expira_em.slice(0, 10) : ""} className={campo} title="Expira em (vazio = sem prazo)" />
                          <button className="h-9 rounded-sm border border-[var(--azul)] px-2 text-xs font-semibold text-[var(--azul)]">Salvar</button>
                        </form>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-lg font-semibold">{formatarMilhar(u.saldo)}</p>
                        <form action={concederCreditos} className="mt-1 flex items-center gap-1">
                          <input type="hidden" name="user_id" value={u.id} />
                          <input name="qtd" type="number" placeholder="+10 / -5" className={`${campo} w-24`} />
                          <select name="motivo" className={campo}><option value="bonus">bônus</option><option value="compra">compra</option></select>
                          <button className="h-9 rounded-sm border border-[var(--azul)] px-2 text-xs font-semibold text-[var(--azul)]">Aplicar</button>
                        </form>
                      </td>
                      <td className="px-3 py-3 text-xs text-neutral-600">
                        {u.buscas_mes} buscas<br />{u.analises_mes} análises
                      </td>
                      <td className="px-3 py-3">
                        {u.id !== usuario.id && (
                          <form action={definirAdmin}>
                            <input type="hidden" name="user_id" value={u.id} />
                            <input type="hidden" name="admin" value={u.is_admin ? "false" : "true"} />
                            <button className="text-xs font-semibold text-[var(--azul)]">{u.is_admin ? "Remover admin" : "Tornar admin"}</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {aba === "analises" && (
          <section className="overflow-x-auto rounded-md bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr><th className="px-3 py-2">Pedida</th><th className="px-3 py-2">Usuário</th><th className="px-3 py-2">Lote</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Custo</th><th className="px-3 py-2"></th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {analises.map((a) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2 text-xs text-neutral-600">{formatarDataHora(a.pedido_em)}</td>
                    <td className="px-3 py-2 text-xs">{a.email}</td>
                    <td className="px-3 py-2"><Link href={`/leilao/${a.auction_id}`} className="text-[var(--azul)]">{a.titulo.slice(0, 50)}</Link></td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{a.status}</span>
                      {a.erro && <p className="max-w-xs truncate text-xs text-red-700" title={a.erro}>{a.erro}</p>}
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-600">{a.tokens ? `${formatarMilhar(a.tokens)} tokens` : "—"}<br />{a.modelo ?? ""}</td>
                    <td className="px-3 py-2 text-right">
                      {a.status === "disponivel" ? (
                        <Link href={`/analises/${a.id}`} className="text-xs font-semibold text-[var(--azul)]">Ver</Link>
                      ) : (
                        <form action={reprocessarAnalise}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="voltar" value="/admin?aba=analises" />
                          <button className="text-xs font-semibold text-[var(--azul)]">Reprocessar</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {!analises.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-neutral-500">Nenhuma análise pedida ainda.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {aba === "fontes" && (
          <section className="overflow-x-auto rounded-md bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr><th className="px-3 py-2">Fonte</th><th className="px-3 py-2">Plataforma</th><th className="px-3 py-2">Última coleta</th><th className="px-3 py-2">Último erro</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {fontes.map((f) => (
                  <tr key={f.id}>
                    <td className="px-3 py-2 font-medium">{f.id}{!f.ativo && <span className="ml-2 text-xs text-neutral-400">(inativa)</span>}</td>
                    <td className="px-3 py-2">{f.plataforma}</td>
                    <td className="px-3 py-2 text-xs text-neutral-600">{f.ultima_coleta ? formatarDataHora(f.ultima_coleta) : "nunca"}</td>
                    <td className="px-3 py-2 text-xs text-red-700">{f.ultimo_erro ?? <span className="text-[var(--verde)]">ok</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-3 text-xs text-neutral-500">
              A coleta roda no GitHub Actions às 5h e 13h. Para adicionar um leiloeiro, inclua a base em <code>scripts/coleta/fontes.json</code>. Disparo manual: Actions → “Coleta de leilões” → Run workflow.
            </p>
          </section>
        )}
      </main>
      <Rodape />
    </>
  );
}
