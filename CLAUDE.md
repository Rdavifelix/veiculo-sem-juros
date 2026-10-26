# CLAUDE.md — Veículo Sem Juros

Site de leilão de veículos. Projeto **novo e independente** — não compartilha código, banco nem
deploy com o `crmxpn` (CRM XPN). Nada daquele repositório vale aqui, exceto as lições de processo.

## Stack
- **Next.js 16 (App Router, Turbopack)** + React 19 + TypeScript estrito.
- **Tailwind v4** (config via CSS em `app/globals.css`, sem `tailwind.config`).
- **Supabase** (Postgres + Auth + Storage + Realtime) via `@supabase/ssr`.
  Clientes em `lib/supabase/{client,server}.ts` — usar o certo para cada lado.
- Deploy: **Vercel**, variáveis `NEXT_PUBLIC_*` no projeto. `SUPABASE_SERVICE_ROLE_KEY` só no servidor.

## Estado
- 26/10/2026: esqueleto criado (typecheck + build verdes). **Site modelo = BuscaAii** (agregador de
  leilões + créditos + análises), mapeado tela a tela em `docs/MODELO.md` — é a spec. Nada do domínio
  implementado ainda.
- 26/10/2026: decidido **raspagem própria** como fonte dos leilões (`docs/FONTES.md`): o BuscaAii agrega
  centenas de leiloeiros pequenos que usam 3–4 plataformas white-label (Suporte Leilões, Leilotech, Grupo
  Lance) + marketplaces com API JSON (Superbid, Sodré Santoro). Protótipo em `scripts/coleta/` (Node puro,
  `node scripts/coleta/index.mjs --fonte=…`), 4 coletores validados. Decididos também: **acesso vendido por
  fora** (sem cadastro público) e **análises por IA**.
- 26/10/2026: **front end da vitrine** (`/`) na linha do Mercado Livre/ofertas: cabeçalho amarelo com busca,
  abas com ícone (Todos · Encerra hoje · Parcela em até 30x · Bancos e seguradoras · Carros · Motos · Caminhões),
  filtros laterais com contagem (tipo, categoria, preço, UF, marca), grade de cards (foto, badge de data,
  selo "Entrada 25% · até 30x", 1ª praça riscada, % OFF, botão 🔒 Acessar leilão), ordenação e paginação.
  Tudo por `searchParams` em Server Component (`app/page.tsx`). Dados: `lib/leiloes/repositorio.ts` lendo
  `data/seed/leiloes.json` (179 lotes reais coletados hoje). `/login` é placeholder.
- 26/10/2026: projeto Supabase criado (≈US$ 10/mês de instância Micro na org Pro, aprovado pelo dono), migração
  `20261026000100_fontes_e_auctions.sql` aplicada, semente carregada via extensão `http` (o Postgres baixou
  `data/seed/leiloes.json` do GitHub — o repo é público). `lib/leiloes/repositorio.ts` lê a view
  `auctions_vitrine` quando há env (`lib/leiloes/supabase.ts`, cache de 5 min) e cai na semente sem env.
- Projeto Supabase: **`veiculo-sem-juros`** (ref `bjrjngzckbezajjrkfwb`, org "sekretaria Org", sa-east-1), criado em
  26/10/2026. URL `https://bjrjngzckbezajjrkfwb.supabase.co`; chave publicável no `.env.local` (não no git).
  Migração aplicada: `fontes`, `auctions`, view `auctions_vitrine`. 179 lotes carregados da semente.
  Não usar o `gaeimhrftedqdkjkpyyr` do CRM.
- Projeto Vercel: ainda não conectado.

## Regras
- **Nenhum secret no repo.** `.env.local` fora do git; `.env.example` só com nomes.
- Toda tabela nasce com RLS e policies explícitas; `revoke` de `anon` no que não é público.
- Páginas públicas de veículos/lotes: Server Components com `generateMetadata` (SEO importa aqui).
- Lances e estado ao vivo: Supabase Realtime, com a regra de negócio (incremento, encerramento,
  prorrogação) **no banco** (RPC/trigger), nunca só no cliente.
- Verificação antes de push: `npm run typecheck && npm run lint && npm run build`.
- Commits em português, pequenos, descrevendo o porquê.

- 26/10/2026: **job de coleta** em GitHub Actions (`.github/workflows/coleta.yml`, 05h e 13h BRT) rodando
  `scripts/coleta/rodar-tudo.mjs` → `gravar.mjs` (upsert, removidos, encerrados) sobre `fontes.json` (6 fontes).
  Testado localmente com `--sem-gravar`. **Falta o dono cadastrar o secret `SUPABASE_SERVICE_ROLE_KEY`** no
  repositório para a primeira execução gravar.

- 26/10/2026 (noite): **auth + créditos + busca paga.** Supabase Auth (e-mail/senha; `proxy.ts` renova sessão;
  `lib/auth.ts`), tabelas `profiles`, `unlocks`, `credit_ledger`, `searches` e RPCs `registrar_busca`,
  `desbloquear_leilao`, `saldo_creditos`, `cota_buscas`, `conceder_creditos` (migrações 000200 e 000300).
  Regra toda no banco: 1 crédito por busca com resultado e por link desbloqueado; grátis sem resultado,
  reabrir e paginar. `/` virou home pública (hero + destaques + FAQ); `/busca` (logado) tem a barra do modelo
  (`BarraBusca`: campo + Buscar + chips + cota N/20) e só mostra resultados de uma busca paga (`?s=<id>`);
  `/leilao/[id]/acessar` é a confirmação de 1 crédito; `/desbloqueados` lista os links. Primeiro usuário criado
  via SQL (auth.users + identities) com 20 créditos de bônus. Sem cadastro público, sem checkout ainda.

- 26/10/2026 (madrugada): **planos, admin e análises por IA.** Tabela `planos` (`vsj` e `premium`), `profiles.plano/
  plano_expira_em/is_admin`, RPC `plano_atual()`; `registrar_busca` não cobra no Premium. `analyses` + RPCs
  `solicitar_analise` (cota mensal, exige desbloqueio), `iniciar_analise`, `concluir_analise`, `ficha_para_analise`
  (única RPC que devolve `fonte_url` + raw, só para quem desbloqueou/admin). `fipe_cache` + `lib/fipe.ts` (API
  pública parallelum, casamento por similaridade). `lib/ia/analise.ts`: Claude `claude-opus-5-5` via
  `messages.parse` + `zodOutputFormat`, PDFs do edital como `document`, `web_search` para preço de mercado;
  roda em `after()` da Server Action e grava via RPC. Páginas: `/admin` (visão, usuários com plano/créditos/
  admin, análises com reprocessar, fontes), `/analises`, `/analises/[id]`, bloco "Inteligência Premium" na ficha.
  João = admin + Premium (migração 000400). **Pendente:** `ANTHROPIC_API_KEY` no servidor (sem ela a análise
  registra erro visível no admin); `SUPABASE_SERVICE_ROLE_KEY` no servidor para criar contas pelo painel.
  Webmotors bloqueia robôs (PerimeterX): valor de mercado vem da busca web dentro da análise, com links.

- 26/10/2026 (manhã): **análise com recomendações de uso próprio e revenda.** `EsquemaAnalise` ganhou `recomendacoes`
  (uso_proprio/revenda: recomenda, nota 0–10, motivo, custo total, preço de revenda min/estimado/max, prazo, lucro, margem),
  `cenarios_revenda` (2–4 cenários com lista de custos e conta fechada) e `lance_maximo.valor_revenda` (teto para revender;
  em vermelho quando fica abaixo da 2ª praça). Página `/analises/[id]` mostra foto do lote, cartões de recomendação, tabela
  de custos por cenário e botão **Baixar PDF** (`BotaoImprimir` → `window.print()`; CSS `@media print` em `globals.css`,
  cabeçalho/rodapé/nav com `print:hidden`). Lista `/analises` tem miniatura do carro. `lib/leiloes/parcelamento.ts`
  detecta edital sem parcelamento (alienação antecipada criminal, "à vista") → `parcelavel=false` mesmo em judicial.
  Análise manual 79031148 (Discovery Sport) atualizada com os campos novos via SQL.

## Front end
- Paleta em `app/globals.css` (`--amarelo`, `--azul`, `--verde`, `--laranja`, `--fundo`). Sem dark mode por ora.
- `LeilaoVitrine` (lib/leiloes/tipos.ts) **não tem `fonte_url`**: o link do leiloeiro só sai via desbloqueio.
- Busca é um `<form>` POST para a Server Action `buscar` (cobra) que redireciona para GET com `?s=`; GET nunca
  cobra. Paginação/ordenação preservam `s`. Facetas de marca vêm de `listar({}, {maximo: 1})`.
- Criar usuário: `insert into auth.users/auth.identities` (ver histórico no MCP) + `conceder_creditos(id, n, 'bonus')`.
  Senha nunca no repositório nem no chat; preferir enviar link de redefinição (`/login/esqueci`).
- Imagens de terceiros com `next/image unoptimized` e `remotePatterns: **`.
- Cache da vitrine é em memória do processo (5 min) — **não** usar `unstable_cache` (limite de 2 MB por entrada).
- Dados: `lib/leiloes/supabase.ts` lê `auctions_vitrine` (anon só enxerga a view; `fonte_url` e `raw` completo
  nunca saem). Carga/atualização de lotes é só com service role (job) ou via MCP `execute_sql`.
- **O repositório GitHub é público**: nada sensível em `data/seed` além de dados já públicos nos leiloeiros.

## Planos, créditos e IA
- Regra de cobrança fica nas RPCs; o front só lê `carteira()` (saldo, cotas, plano, admin). Nunca decidir cobrança no cliente.
- Enum em `update ... set status = case ... end` precisa de `::public.status_analise` (PostgREST devolve 42804 sem o cast).
- `after()` da Server Action mantém a sessão do usuário: as RPCs de análise rodam como o próprio usuário (ou admin).
- Análise: não truncar PDFs; até 3 documentos de 20 MB. Se faltar chave da API, o erro vai para `analyses.erro`.

## Coleta (scripts/coleta)
- Coletores são `.mjs` sem dependências; `sodresantoro` precisa de `playwright` (WAF). 1 req/s por host, UA
  identificável, só páginas públicas. Formato de saída = tabela `auctions`. Não usar a base do BuscaAii como fonte.
- Superbid: a API pública não filtra "encerramento futuro"; filtrar `endDateTime` no cliente. Leilotech: fotos e
  praças só via JS (pendente). Suporte Leilões tem duas versões (clássica Symfony e nova Next.js; só a clássica tem parser).

## Como verificar
- `npm run typecheck` checa de verdade (tsconfig único, sem `files: []`).
- `npm run build` falha em erro de tipo no Next; mantenha assim.

> Atualizar este arquivo ao fim de cada bloco de trabalho (estado, decisões, gotchas).
