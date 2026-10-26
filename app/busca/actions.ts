"use server";

import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { filtrosDaBusca, registrarBusca } from "@/lib/creditos";
import { listar } from "@/lib/leiloes/repositorio";
import { lerFiltros } from "@/lib/leiloes/filtros";

/**
 * Clique em "Buscar": executa a busca, cobra 1 crédito se houve resultado e redireciona para a URL com
 * `s=<id da busca>`. Abrir, paginar ou ordenar essa URL depois não cobra de novo (a página confere o `s`).
 */
export async function buscar(form: FormData) {
  if (!(await usuarioAtual())) redirect("/login?next=/busca");
  const bruto: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string" && v !== "") bruto[k] = v;
  const filtros = lerFiltros(bruto);
  const chave = filtrosDaBusca(filtros);

  const resultado = await listar({ ...filtros, pagina: 1 });
  const r = await registrarBusca(chave, resultado.total);
  const p = new URLSearchParams(chave);
  if ("search_id" in r) p.set("s", r.search_id);
  else p.set("erro", r.erro);
  redirect(`/busca?${p}`);
}
