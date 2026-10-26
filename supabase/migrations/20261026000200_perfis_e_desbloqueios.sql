-- Perfis (1:1 com auth.users) e desbloqueios de link. Acesso é vendido por fora: contas são criadas pelo
-- backoffice, não há cadastro público. Nesta fase todo usuário logado pode abrir o link do leiloeiro; o
-- débito de crédito entra na próxima fase (ver docs/MODELO.md) dentro da mesma RPC.

create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  nome               text,
  whatsapp           text,
  onboarding_done_at timestamptz,
  perfil_oportunidade jsonb,
  created_at         timestamptz not null default now()
);

create or replace function public.criar_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.criar_profile();

create table public.unlocks (
  user_id    uuid not null references auth.users(id) on delete cascade,
  auction_id uuid not null references public.auctions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, auction_id)
);

alter table public.profiles enable row level security;
alter table public.unlocks  enable row level security;
revoke all on public.profiles from anon;
revoke all on public.unlocks  from anon;

create policy "perfil: dono lê"      on public.profiles for select to authenticated using (id = auth.uid());
create policy "perfil: dono edita"   on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "unlocks: dono lê"     on public.unlocks  for select to authenticated using (user_id = auth.uid());

-- Única porta de saída de `fonte_url`. Idempotente: reabrir um lote já desbloqueado não cria nada novo.
create or replace function public.desbloquear_leilao(p_auction uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_url text;
begin
  if auth.uid() is null then
    raise exception 'login necessário' using errcode = '42501';
  end if;
  select fonte_url into v_url from public.auctions where id = p_auction;
  if v_url is null then
    raise exception 'leilão não encontrado' using errcode = 'P0002';
  end if;
  insert into public.unlocks (user_id, auction_id) values (auth.uid(), p_auction)
  on conflict do nothing;
  return v_url;
end $$;

revoke all on function public.desbloquear_leilao(uuid) from public, anon;
grant execute on function public.desbloquear_leilao(uuid) to authenticated;
