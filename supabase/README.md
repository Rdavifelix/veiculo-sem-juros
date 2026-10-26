# Banco (Supabase)

Projeto Supabase **próprio** do Veículo Sem Juros — não reaproveitar o do CRM XPN.

- Migrations versionadas em `supabase/migrations/` (`supabase db push` ou MCP `apply_migration`).
- Toda tabela nasce com RLS ligado e `revoke all from anon` no que não for público.
- Schema do leilão será definido depois do site modelo (ver `docs/MODELO.md`).
