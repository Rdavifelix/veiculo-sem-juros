# Coleta de leilões — protótipo

Scripts Node (sem build, sem dependências além do Node 22) que extraem lotes de veículos de sites de
leiloeiros e devolvem registros no formato da tabela `auctions` (ver `docs/MODELO.md` e `lib.mjs`).
Contexto e estratégia completa em `docs/FONTES.md`.

```bash
# plataformas white-label: um coletor serve N leiloeiros, basta trocar --base
node scripts/coleta/index.mjs --fonte=suporteleiloes --base=https://www.depaulaonline.com.br --limite=20
node scripts/coleta/index.mjs --fonte=leilotech     --base=https://arrematabem.com.br           --limite=20

# leiloeiros grandes com API JSON própria
node scripts/coleta/index.mjs --fonte=superbid     --limite=100
node scripts/coleta/index.mjs --fonte=sodresantoro --limite=96     # usa Chromium (playwright) para passar o WAF

# gravar em arquivo em vez de stdout
node scripts/coleta/index.mjs --fonte=superbid --limite=100 --saida=/tmp/superbid.json
```

Regras que todos os coletores seguem (`lib.mjs`):
- 1 requisição por host por segundo, User-Agent identificável, 3 tentativas com espera crescente.
- Só páginas públicas; nada de login, nada de lance. `robots.txt` dos sites verificado em 26/10/2026.
- Guardamos o bruto em `raw` para reprocessar sem recoletar.

`sodresantoro` usa `playwright` (devDependency; rode `npx playwright install chromium` uma vez, ou aponte
`PLAYWRIGHT_CHROMIUM_PATH` para um Chromium existente); os demais não precisam de navegador.

## Job agendado (GitHub Actions)

`.github/workflows/coleta.yml` roda `rodar-tudo.mjs` às 05h e 13h (Brasília) e também à mão em Actions.
Ele percorre `fontes.json` (para adicionar um leiloeiro de plataforma white-label, inclua a base lá), coleta
cada fonte e grava no Supabase com a chave de serviço (`gravar.mjs`):

- upsert por `(fonte, external_id)`; lotes da fonte que não vieram na coleta → `status = 'removido'`
  (uma coleta vazia não remove nada, pode ser falha do site);
- lotes com `encerra_em` no passado → `status = 'encerrado'`;
- erro de coleta de uma fonte (site fora, WAF) vai para `fontes.ultimo_erro` e aparece no resumo, sem derrubar
  as outras; o job só falha (código 1) se uma gravação falhar ou se nenhuma fonte coletar nada.
- duplicatas dentro da mesma coleta (a API do Superbid repete ofertas entre páginas) são removidas antes do upsert.

```bash
# ensaio local, sem gravar (coleta real, 5 lotes por fonte)
node scripts/coleta/rodar-tudo.mjs --sem-gravar --limite=5
# gravando (só em máquina de confiança; a chave de serviço ignora RLS)
SUPABASE_URL=https://bjrjngzckbezajjrkfwb.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/coleta/rodar-tudo.mjs --so=superbid
```

Segredo exigido no repositório: `SUPABASE_SERVICE_ROLE_KEY` (Settings → Secrets and variables → Actions).
