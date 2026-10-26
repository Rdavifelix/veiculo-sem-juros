# Veículo Sem Juros

Site de leilão de veículos. **Next.js (App Router) + Supabase + Tailwind**, deploy na Vercel.

## Rodar local
```bash
nvm use            # Node 22
npm install
cp .env.example .env.local   # preencher com o projeto Supabase
npm run dev        # http://localhost:3000
```

## Verificar antes de commitar
```bash
npm run typecheck && npm run lint && npm run build
```

## Estrutura
- `app/` — rotas (App Router). `/` é a vitrine de leilões (Server Component, filtros por query string).
- `components/` — UI da vitrine (cabeçalho, abas, filtros, card).
- `lib/leiloes/` — tipos e repositório (hoje lê `data/seed/leiloes.json`; depois a view `auctions_vitrine`).
- `lib/supabase/` — clientes browser/server.
- `scripts/coleta/` — coletores de leilões (ver `docs/FONTES.md`).
- `supabase/migrations/` — schema versionado.
- `docs/MODELO.md` — spec (site modelo BuscaAii); `docs/FONTES.md` — fontes e coleta.

Mais contexto para agentes em `CLAUDE.md`.
