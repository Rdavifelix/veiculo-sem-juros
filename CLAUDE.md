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

## Como verificar
- `npm run typecheck` checa de verdade (tsconfig único, sem `files: []`).
- `npm run build` falha em erro de tipo no Next; mantenha assim.

> Atualizar este arquivo ao fim de cada bloco de trabalho (estado, decisões, gotchas).
