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
- `app/` — rotas (App Router). Páginas públicas de veículo são Server Components (SEO).
- `components/` — UI compartilhada.
- `lib/supabase/` — clientes browser/server.
- `supabase/migrations/` — schema versionado.
- `docs/MODELO.md` — spec do leilão (pendente do site modelo).

Mais contexto para agentes em `CLAUDE.md`.
