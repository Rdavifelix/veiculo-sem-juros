#!/usr/bin/env node
// Protótipo de coleta de leilões de veículos. Uso:
//   node scripts/coleta/index.mjs --fonte=suporteleiloes --base=https://www.depaulaonline.com.br --limite=20
//   node scripts/coleta/index.mjs --fonte=leilotech --base=https://arrematabem.com.br --limite=20
//   node scripts/coleta/index.mjs --fonte=superbid --limite=50
//   node scripts/coleta/index.mjs --fonte=sodresantoro --limite=48        (precisa de playwright)
// Opções: --saida=arquivo.json (padrão: stdout) --sem-detalhes (suporteleiloes: só cards)
import { writeFile } from "node:fs/promises";
import * as suporteleiloes from "./fontes/suporteleiloes.mjs";
import * as leilotech from "./fontes/leilotech.mjs";
import * as superbid from "./fontes/superbid.mjs";
import * as sodresantoro from "./fontes/sodresantoro.mjs";

const FONTES = { suporteleiloes, leilotech, superbid, sodresantoro };

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);

const fonte = FONTES[args.fonte];
if (!fonte) {
  console.error(`Fonte desconhecida. Use --fonte=${Object.keys(FONTES).join("|")}`);
  process.exit(1);
}
if ((args.fonte === "suporteleiloes" || args.fonte === "leilotech") && !args.base) {
  console.error("Essa fonte é uma plataforma multi-leiloeiro: informe --base=https://site-do-leiloeiro");
  process.exit(1);
}

const inicio = Date.now();
const log = (m) => console.error(`[${args.fonte}] ${m}`);
const leiloes = await fonte.coletar({
  base: args.base?.replace(/\/$/, ""),
  limite: Number(args.limite ?? 50),
  detalhes: args["sem-detalhes"] !== "true",
  log,
});

const resumo = {
  fonte: args.fonte,
  base: args.base ?? null,
  total: leiloes.length,
  segundos: Math.round((Date.now() - inicio) / 1000),
  com_data: leiloes.filter((l) => l.encerra_em).length,
  com_valor: leiloes.filter((l) => l.lance_1 ?? l.lance_atual).length,
  com_cidade: leiloes.filter((l) => l.cidade).length,
  com_foto: leiloes.filter((l) => l.fotos.length).length,
  por_tipo: Object.fromEntries(["judicial", "extrajudicial", "nd"].map((t) => [t, leiloes.filter((l) => l.tipo === t).length])),
};
log(JSON.stringify(resumo));

const saida = JSON.stringify({ resumo, leiloes }, null, 2);
if (args.saida) {
  await writeFile(args.saida, saida);
  log(`gravado em ${args.saida}`);
} else {
  process.stdout.write(saida + "\n");
}
