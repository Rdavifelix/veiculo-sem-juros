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

`sodresantoro` precisa de `playwright` (`npm i -D playwright && npx playwright install chromium`); os demais não.
