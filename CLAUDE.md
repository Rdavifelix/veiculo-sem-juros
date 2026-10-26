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
- Projeto Supabase: **ainda não criado**. Criar um projeto próprio (não o `gaeimhrftedqdkjkpyyr` do CRM).
- Projeto Vercel: ainda não conectado.

## Regras
- **Nenhum secret no repo.** `.env.local` fora do git; `.env.example` só com nomes.
- Toda tabela nasce com RLS e policies explícitas; `revoke` de `anon` no que não é público.
- Páginas públicas de veículos/lotes: Server Components com `generateMetadata` (SEO importa aqui).
- Lances e estado ao vivo: Supabase Realtime, com a regra de negócio (incremento, encerramento,
  prorrogação) **no banco** (RPC/trigger), nunca só no cliente.
- Verificação antes de push: `npm run typecheck && npm run lint && npm run build`.
- Commits em português, pequenos, descrevendo o porquê.

## Coleta (scripts/coleta)
- Coletores são `.mjs` sem dependências; `sodresantoro` precisa de `playwright` (WAF). 1 req/s por host, UA
  identificável, só páginas públicas. Formato de saída = tabela `auctions`. Não usar a base do BuscaAii como fonte.
- Superbid: a API pública não filtra "encerramento futuro"; filtrar `endDateTime` no cliente. Leilotech: fotos e
  praças só via JS (pendente). Suporte Leilões tem duas versões (clássica Symfony e nova Next.js; só a clássica tem parser).

## Como verificar
- `npm run typecheck` checa de verdade (tsconfig único, sem `files: []`).
- `npm run build` falha em erro de tipo no Next; mantenha assim.

> Atualizar este arquivo ao fim de cada bloco de trabalho (estado, decisões, gotchas).
