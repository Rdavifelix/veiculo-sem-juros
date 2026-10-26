-- Créditos (regra de negócio do modelo, toda no banco):
--   1 crédito = uma busca com resultado  |  1 crédito = desbloquear o link de um lote
--   grátis    = busca sem resultado, reabrir lote já desbloqueado, paginar/ordenar a mesma busca
--   créditos não expiram; saldo = soma do extrato. Cota informativa: buscas pagas no mês / 20.
-- Débito é transacional (advisory lock por usuário) e só acontece dentro das RPCs abaixo.

create type public.motivo_credito as enum ('compra', 'busca', 'desbloqueio', 'bonus', 'estorno');

create table public.credit_ledger (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  delta      integer not null check (delta <> 0),
  motivo     public.motivo_credito not null,
  ref_id     text,
  created_at timestamptz not null default now()
);
create index credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

create table public.searches (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  filtros        jsonb not null default '{}'::jsonb,
  total          integer not null default 0,
  custou_credito boolean not null default false,
  created_at     timestamptz not null default now()
);
create index searches_user_idx on public.searches (user_id, created_at desc);

alter table public.credit_ledger enable row level security;
alter table public.searches      enable row level security;
revoke all on public.credit_ledger from anon, authenticated;
revoke all on public.searches      from anon, authenticated;
grant select on public.credit_ledger to authenticated;
grant select on public.searches      to authenticated;
create policy "extrato: dono lê" on public.credit_ledger for select to authenticated using (user_id = auth.uid());
create policy "buscas: dono lê"  on public.searches      for select to authenticated using (user_id = auth.uid());

-- Saldo do usuário logado.
create or replace function public.saldo_creditos()
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::integer from public.credit_ledger where user_id = auth.uid();
$$;
revoke all on function public.saldo_creditos() from public, anon;
grant execute on function public.saldo_creditos() to authenticated;

-- Cota informativa do período (mês corrente): buscas que custaram crédito / limite.
create or replace function public.cota_buscas()
returns table (usadas integer, limite integer) language sql stable security definer set search_path = public as $$
  select count(*)::integer, 20
    from public.searches
   where user_id = auth.uid() and custou_credito and created_at >= date_trunc('month', now());
$$;
revoke all on function public.cota_buscas() from public, anon;
grant execute on function public.cota_buscas() to authenticated;

-- Débito interno: não é exposto; só as RPCs abaixo chamam.
create or replace function public.gastar_credito(p_user uuid, p_motivo public.motivo_credito, p_ref text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_saldo integer;
begin
  perform pg_advisory_xact_lock(hashtext('creditos:' || p_user::text));
  select coalesce(sum(delta), 0) into v_saldo from public.credit_ledger where user_id = p_user;
  if v_saldo < 1 then
    raise exception 'sem créditos' using errcode = 'P0001';
  end if;
  insert into public.credit_ledger (user_id, delta, motivo, ref_id) values (p_user, -1, p_motivo, p_ref);
  return v_saldo - 1;
end $$;
revoke all on function public.gastar_credito(uuid, public.motivo_credito, text) from public, anon, authenticated;

-- Registra uma busca. Cobra 1 crédito só se houve resultado. Devolve id da busca, se cobrou e o saldo.
create or replace function public.registrar_busca(p_filtros jsonb, p_total integer)
returns table (search_id uuid, custou boolean, saldo integer)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_saldo integer;
begin
  if auth.uid() is null then
    raise exception 'login necessário' using errcode = '42501';
  end if;
  if p_total > 0 then
    v_id := gen_random_uuid();
    v_saldo := public.gastar_credito(auth.uid(), 'busca', v_id::text);
    insert into public.searches (id, user_id, filtros, total, custou_credito) values (v_id, auth.uid(), p_filtros, p_total, true);
    return query select v_id, true, v_saldo;
  else
    insert into public.searches (user_id, filtros, total, custou_credito) values (auth.uid(), p_filtros, 0, false) returning id into v_id;
    return query select v_id, false, public.saldo_creditos();
  end if;
end $$;
revoke all on function public.registrar_busca(jsonb, integer) from public, anon;
grant execute on function public.registrar_busca(jsonb, integer) to authenticated;

-- Desbloqueio agora cobra 1 crédito na primeira vez; reabrir é grátis.
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
  if not exists (select 1 from public.unlocks where user_id = auth.uid() and auction_id = p_auction) then
    perform public.gastar_credito(auth.uid(), 'desbloqueio', p_auction::text);
    insert into public.unlocks (user_id, auction_id) values (auth.uid(), p_auction) on conflict do nothing;
  end if;
  return v_url;
end $$;

-- Concessão de créditos (compra confirmada, bônus, estorno): só backoffice/service role.
create or replace function public.conceder_creditos(p_user uuid, p_qtd integer, p_motivo public.motivo_credito, p_ref text default null)
returns integer language plpgsql security definer set search_path = public as $$
begin
  if p_qtd <= 0 then raise exception 'quantidade inválida'; end if;
  insert into public.credit_ledger (user_id, delta, motivo, ref_id) values (p_user, p_qtd, p_motivo, p_ref);
  return (select coalesce(sum(delta), 0) from public.credit_ledger where user_id = p_user);
end $$;
revoke all on function public.conceder_creditos(uuid, integer, public.motivo_credito, text) from public, anon, authenticated;
