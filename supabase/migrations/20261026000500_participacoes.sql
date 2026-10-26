-- Participações: o usuário marca, depois da análise, os leilões de que pretende participar.
-- Alimenta a Agenda (calendário do Premium). Só quem desbloqueou o lote pode marcar.

create table public.participacoes (
  user_id       uuid not null references auth.users (id) on delete cascade,
  auction_id    uuid not null references public.auctions (id) on delete cascade,
  lance_maximo  numeric(14, 2),
  observacao    text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (user_id, auction_id)
);

create index participacoes_auction_idx on public.participacoes (auction_id);

alter table public.participacoes enable row level security;
revoke all on public.participacoes from anon;
grant select, insert, update, delete on public.participacoes to authenticated;

create policy "participacoes: dono lê"    on public.participacoes for select to authenticated using (user_id = auth.uid());
create policy "participacoes: dono marca" on public.participacoes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.unlocks u where u.user_id = auth.uid() and u.auction_id = participacoes.auction_id)
  );
create policy "participacoes: dono edita" on public.participacoes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "participacoes: dono apaga" on public.participacoes for delete to authenticated using (user_id = auth.uid());

create or replace function public.participacoes_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

create trigger participacoes_atualizado_em
  before update on public.participacoes
  for each row execute function public.participacoes_atualizado_em();
