#!/usr/bin/env node
// Job de coleta: percorre `fontes.json`, coleta cada fonte e grava no Supabase. É o que o GitHub Actions roda.
// Uso local:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/coleta/rodar-tudo.mjs
//             node scripts/coleta/rodar-tudo.mjs --sem-gravar --limite=20   (só coleta, imprime resumo)
//             node scripts/coleta/rodar-tudo.mjs --so=superbid              (uma fonte)
// Uma fonte que falha não derruba as outras: o erro vai para `fontes.ultimo_erro` e o job termina com código 1.
import { readFile } from "node:fs/promises";
import * as suporteleiloes from "./fontes/suporteleiloes.mjs";
import * as leilotech from "./fontes/leilotech.mjs";
import * as superbid from "./fontes/superbid.mjs";
import * as sodresantoro from "./fontes/sodresantoro.mjs";
import { clienteServico, encerrarVencidos, gravarFonte } from "./gravar.mjs";

const COLETORES = { suporteleiloes, leilotech, superbid, sodresantoro };

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v = "true"]) => [k, v]));
const semGravar = args["sem-gravar"] === "true";
const limiteGlobal = args.limite ? Number(args.limite) : null;

const config = JSON.parse(await readFile(new URL("./fontes.json", import.meta.url), "utf8"));
const sb = semGravar ? null : clienteServico();
const inicio = Date.now();
const resumo = [];
// Falha de COLETA de uma fonte (site fora, WAF) é esperada de vez em quando: fica em fontes.ultimo_erro e no
// resumo. O job só falha (código 1) se uma GRAVAÇÃO falhar ou se nenhuma fonte tiver coletado nada.
let erroGravacao = false;

for (const item of config.fontes) {
  if (args.so && args.so !== item.fonte) continue;
  const coletor = COLETORES[item.fonte];
  if (!coletor) {
    console.error(`fonte desconhecida em fontes.json: ${item.fonte}`);
    erroGravacao = true;
    continue;
  }
  const bases = item.bases ?? [null];
  for (const base of bases) {
    const fonteId = base ? `${item.fonte}:${new URL(base).host.replace(/^www\./, "")}` : item.fonte;
    const log = (m) => console.error(`[${fonteId}] ${m}`);
    const t0 = Date.now();
    let leiloes = [];
    let erro = null;
    try {
      leiloes = await coletor.coletar({ base: base?.replace(/\/$/, ""), limite: limiteGlobal ?? item.limite ?? 500, log });
    } catch (e) {
      erro = e.message;
      log(`FALHOU: ${erro}`);
    }
    let gravacao = { gravados: 0, removidos: 0 };
    if (sb) {
      try {
        gravacao = await gravarFonte(sb, fonteId, leiloes, { plataforma: item.fonte, base_url: base, erro });
      } catch (e) {
        erroGravacao = true;
        log(`GRAVAÇÃO FALHOU: ${e.message}`);
        erro = (erro ? erro + " | " : "") + e.message;
      }
    }
    resumo.push({ fonte: fonteId, coletados: leiloes.length, ...gravacao, segundos: Math.round((Date.now() - t0) / 1000), erro });
  }
}

let encerrados = 0;
if (sb) {
  try {
    encerrados = await encerrarVencidos(sb);
  } catch (e) {
    erroGravacao = true;
    console.error(`encerrar vencidos FALHOU: ${e.message}`);
  }
}

const nenhumaColetou = resumo.length > 0 && resumo.every((r) => r.coletados === 0);
const fontesComErro = resumo.filter((r) => r.erro).map((r) => r.fonte);
console.table(resumo);
console.log(
  JSON.stringify({
    encerrados,
    total_segundos: Math.round((Date.now() - inicio) / 1000),
    fontes_com_erro: fontesComErro,
    falha: erroGravacao || nenhumaColetou,
  }),
);
process.exit(erroGravacao || nenhumaColetou ? 1 : 0);
