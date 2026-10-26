-- Fontes de coleta e lotes de leilão. Espelha `scripts/coleta/lib.mjs` (normalizar) e `lib/leiloes/tipos.ts`.
-- Regras: RLS em tudo; `anon` lê a vitrine por uma VIEW sem `fonte_url` (o link é o produto, sai só via desbloqueio).

create extension if not exists pgcrypto;

create type public.tipo_leilao as enum ('judicial', 'extrajudicial', 'nd');
create type public.status_auction as enum ('ativo', 'removido', 'encerrado');

create table public.fontes (
  id            text primary key,                 -- ex.: 'suporteleiloes:depaulaonline.com.br', 'superbid'
  plataforma    text not null,                    -- suporteleiloes | leilotech | grupolance | superbid | sodresantoro | ...
  base_url      text,                             -- null para fontes com API única
  ativo         boolean not null default true,
  config        jsonb not null default '{}'::jsonb,
  ultima_coleta timestamptz,
  ultimo_erro   text,
  created_at    timestamptz not null default now()
);

create table public.auctions (
  id           uuid primary key default gen_random_uuid(),
  fonte        text not null references public.fontes(id),
  external_id  text not null,
  fonte_url    text not null,                     -- NUNCA exposto ao anon
  titulo       text not null,
  descricao    text,
  marca        text,
  modelo       text,
  ano          smallint,
  cidade       text,
  uf           char(2),
  tipo         public.tipo_leilao not null default 'nd',
  lance_1      numeric(14,2),
  lance_2      numeric(14,2),
  lance_atual  numeric(14,2),
  desconto_pct smallint generated always as (
                 case when lance_1 > 0 and lance_2 is not null then round((1 - lance_2 / lance_1) * 100) end) stored,
  encerra_em   timestamptz,
  fotos        text[] not null default '{}',
  sinistro     jsonb,
  status       public.status_auction not null default 'ativo',
  raw          jsonb not null default '{}'::jsonb,
  coletado_em  timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (fonte, external_id)
);

create index auctions_busca_idx on public.auctions (status, encerra_em);
create index auctions_filtros_idx on public.auctions (tipo, uf, marca);
create index auctions_texto_idx on public.auctions using gin (to_tsvector('portuguese', coalesce(titulo,'') || ' ' || coalesce(descricao,'')));

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger auctions_updated_at before update on public.auctions
  for each row execute function public.set_updated_at();

-- Vitrine pública: tudo menos fonte_url e raw.
create view public.auctions_vitrine
  with (security_invoker = false) as
  select id, fonte, external_id, titulo, descricao, marca, modelo, ano, cidade, uf, tipo,
         lance_1, lance_2, lance_atual, desconto_pct, encerra_em, fotos, sinistro, status,
         raw - 'product' - 'card' as extras, coletado_em
    from public.auctions
   where status = 'ativo';

alter table public.fontes   enable row level security;
alter table public.auctions enable row level security;

revoke all on public.fontes   from anon, authenticated;
revoke all on public.auctions from anon, authenticated;
grant select on public.auctions_vitrine to anon, authenticated;

-- Escrita só pela service role (job de coleta). Nenhuma policy para anon/authenticated = nada passa.
comment on table public.auctions is 'Lotes coletados dos leiloeiros. fonte_url só sai via RPC de desbloqueio (crédito).';
