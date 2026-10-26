-- Planos (VSJ padrão e VSJ Premium), administradores, análises por IA e cache FIPE.
--   VSJ      : créditos (1 por busca com resultado, 1 por desbloqueio), sem análises.
--   Premium  : buscas ilimitadas (não cobram), FIPE + valor de mercado na ficha, N análises/mês, aba "Análises".
-- Toda regra fica no banco (RPCs security definer); o front só exibe.

create table public.planos (
  id                 text primary key,            -- 'vsj' | 'premium'
  nome               text not null,
  buscas_ilimitadas  boolean not null default false,
  analises_mes       integer not null default 0,
  fipe               boolean not null default false,
  mercado            boolean not null default false,
  ativo              boolean not null default true
);
insert into public.planos (id, nome, buscas_ilimitadas, analises_mes, fipe, mercado) values
  ('vsj',     'VSJ (Veículo Sem Juros Padrão)', false, 0,  false, false),
  ('premium', 'VSJ Premium',                    true,  10, true,  true);
alter table public.planos enable row level security;
grant select on public.planos to anon, authenticated;
create policy "planos: público" on public.planos for select using (true);

alter table public.profiles
  add column plano           text not null default 'vsj' references public.planos(id),
  add column plano_expira_em timestamptz,
  add column is_admin        boolean not null default false;

-- Helpers ------------------------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;
grant execute on function public.is_admin() to authenticated;

/** Plano vigente do usuário logado (cai para 'vsj' se o premium expirou). */
create or replace function public.plano_atual()
returns public.planos language sql stable security definer set search_path = public as $$
  select p.* from public.planos p
   where p.id = (
     select case when pr.plano_expira_em is not null and pr.plano_expira_em < now() then 'vsj' else pr.plano end
       from public.profiles pr where pr.id = auth.uid())
$$;
grant execute on function public.plano_atual() to authenticated;

-- Busca: premium não gasta crédito --------------------------------------------------------------------
create or replace function public.registrar_busca(p_filtros jsonb, p_total integer)
returns table (search_id uuid, custou boolean, saldo integer)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_saldo integer;
  v_ilimitado boolean;
begin
  if auth.uid() is null then
    raise exception 'login necessário' using errcode = '42501';
  end if;
  select buscas_ilimitadas into v_ilimitado from public.plano_atual();
  if p_total > 0 and not coalesce(v_ilimitado, false) then
    v_id := gen_random_uuid();
    v_saldo := public.gastar_credito(auth.uid(), 'busca', v_id::text);
    insert into public.searches (id, user_id, filtros, total, custou_credito) values (v_id, auth.uid(), p_filtros, p_total, true);
    return query select v_id, true, v_saldo;
  else
    insert into public.searches (user_id, filtros, total, custou_credito) values (auth.uid(), p_filtros, p_total, false) returning id into v_id;
    return query select v_id, false, public.saldo_creditos();
  end if;
end $$;

-- Análises por IA -------------------------------------------------------------------------------------
create type public.status_analise as enum ('aguardando', 'processando', 'disponivel', 'erro');

create table public.analyses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  auction_id   uuid not null references public.auctions(id) on delete cascade,
  status       public.status_analise not null default 'aguardando',
  resultado    jsonb,                 -- saída estruturada da IA (ver lib/ia/analise.ts)
  erro         text,
  modelo       text,
  tokens       integer,
  pedido_em    timestamptz not null default now(),
  concluida_em timestamptz,
  unique (user_id, auction_id)
);
create index analyses_user_idx on public.analyses (user_id, pedido_em desc);
create index analyses_status_idx on public.analyses (status, pedido_em);
alter table public.analyses enable row level security;
revoke all on public.analyses from anon;
grant select on public.analyses to authenticated;
create policy "analises: dono ou admin lê" on public.analyses for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

/** Cota de análises do mês para o usuário logado. */
create or replace function public.cota_analises()
returns table (usadas integer, limite integer) language sql stable security definer set search_path = public as $$
  select (select count(*)::integer from public.analyses
           where user_id = auth.uid() and pedido_em >= date_trunc('month', now()) and status <> 'erro'),
         coalesce((select analises_mes from public.plano_atual()), 0);
$$;
grant execute on function public.cota_analises() to authenticated;

/** Pede uma análise: exige plano com análises, respeita a cota e exige o lote desbloqueado. Idempotente. */
create or replace function public.solicitar_analise(p_auction uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_usadas integer;
  v_limite integer;
begin
  if auth.uid() is null then raise exception 'login necessário' using errcode = '42501'; end if;
  select id into v_id from public.analyses where user_id = auth.uid() and auction_id = p_auction;
  if v_id is not null then return v_id; end if;
  select usadas, limite into v_usadas, v_limite from public.cota_analises();
  if v_limite = 0 then raise exception 'plano sem análises' using errcode = 'P0001'; end if;
  if v_usadas >= v_limite then raise exception 'cota de análises esgotada' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.unlocks where user_id = auth.uid() and auction_id = p_auction) then
    raise exception 'desbloqueie o leilão antes' using errcode = 'P0001';
  end if;
  insert into public.analyses (user_id, auction_id) values (auth.uid(), p_auction) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.solicitar_analise(uuid) from public, anon;
grant execute on function public.solicitar_analise(uuid) to authenticated;

/** Marca como processando (dono ou admin). Devolve false se já está em outro estado. */
create or replace function public.iniciar_analise(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  update public.analyses set status = 'processando', erro = null
   where id = p_id and status in ('aguardando', 'erro') and (user_id = auth.uid() or public.is_admin())
  returning true into v_ok;
  return coalesce(v_ok, false);
end $$;
revoke all on function public.iniciar_analise(uuid) from public, anon;
grant execute on function public.iniciar_analise(uuid) to authenticated;

/** Grava o resultado (ou o erro). Dono ou admin. */
create or replace function public.concluir_analise(p_id uuid, p_resultado jsonb, p_erro text, p_modelo text, p_tokens integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.analyses
     set status = (case when p_erro is null then 'disponivel' else 'erro' end)::public.status_analise,
         resultado = p_resultado, erro = p_erro, modelo = p_modelo, tokens = p_tokens,
         concluida_em = case when p_erro is null then now() else concluida_em end
   where id = p_id and (user_id = auth.uid() or public.is_admin());
end $$;
revoke all on function public.concluir_analise(uuid, jsonb, text, text, integer) from public, anon;
grant execute on function public.concluir_analise(uuid, jsonb, text, text, integer) to authenticated;

/** A ficha completa, incluindo fonte_url, para quem desbloqueou (a IA precisa do link e dos documentos). */
create or replace function public.ficha_para_analise(p_auction uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(a) - 'id' from public.auctions a
   where a.id = p_auction
     and (public.is_admin() or exists (select 1 from public.unlocks u where u.user_id = auth.uid() and u.auction_id = p_auction));
$$;
revoke all on function public.ficha_para_analise(uuid) from public, anon;
grant execute on function public.ficha_para_analise(uuid) to authenticated;

-- Cache FIPE (consultas à API pública são lentas e limitadas) ----------------------------------------
create table public.fipe_cache (
  chave         text primary key,     -- ex.: 'hyundai|creta|2019'
  resultado     jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.fipe_cache enable row level security;
revoke all on public.fipe_cache from anon, authenticated;
create or replace function public.fipe_cache_ler(p_chave text)
returns jsonb language sql stable security definer set search_path = public as $$
  select resultado from public.fipe_cache where chave = p_chave and atualizado_em > now() - interval '30 days';
$$;
create or replace function public.fipe_cache_gravar(p_chave text, p_resultado jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.fipe_cache (chave, resultado) values (p_chave, p_resultado)
  on conflict (chave) do update set resultado = excluded.resultado, atualizado_em = now();
$$;
revoke all on function public.fipe_cache_ler(text) from public, anon;
revoke all on function public.fipe_cache_gravar(text, jsonb) from public, anon;
grant execute on function public.fipe_cache_ler(text) to authenticated;
grant execute on function public.fipe_cache_gravar(text, jsonb) to authenticated;

-- Administração ---------------------------------------------------------------------------------------
create or replace function public.admin_listar_usuarios()
returns table (id uuid, email text, nome text, plano text, plano_expira_em timestamptz, is_admin boolean, saldo integer,
               buscas_mes integer, analises_mes integer, criado_em timestamptz, ultimo_login timestamptz)
language sql stable security definer set search_path = public as $$
  select u.id, u.email::text, p.nome, p.plano, p.plano_expira_em, p.is_admin,
         coalesce((select sum(delta) from public.credit_ledger l where l.user_id = u.id), 0)::integer,
         (select count(*) from public.searches s where s.user_id = u.id and s.created_at >= date_trunc('month', now()))::integer,
         (select count(*) from public.analyses a where a.user_id = u.id and a.pedido_em >= date_trunc('month', now()))::integer,
         u.created_at, u.last_sign_in_at
    from auth.users u join public.profiles p on p.id = u.id
   where public.is_admin()
   order by u.created_at desc;
$$;
revoke all on function public.admin_listar_usuarios() from public, anon;
grant execute on function public.admin_listar_usuarios() to authenticated;

create or replace function public.admin_definir_plano(p_user uuid, p_plano text, p_expira timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'apenas administradores' using errcode = '42501'; end if;
  update public.profiles set plano = p_plano, plano_expira_em = p_expira where id = p_user;
end $$;
revoke all on function public.admin_definir_plano(uuid, text, timestamptz) from public, anon;
grant execute on function public.admin_definir_plano(uuid, text, timestamptz) to authenticated;

create or replace function public.admin_conceder_creditos(p_user uuid, p_qtd integer, p_motivo public.motivo_credito, p_ref text)
returns integer language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'apenas administradores' using errcode = '42501'; end if;
  if p_qtd = 0 then raise exception 'quantidade inválida'; end if;
  insert into public.credit_ledger (user_id, delta, motivo, ref_id) values (p_user, p_qtd, p_motivo, p_ref);
  return (select coalesce(sum(delta), 0) from public.credit_ledger where user_id = p_user);
end $$;
revoke all on function public.admin_conceder_creditos(uuid, integer, public.motivo_credito, text) from public, anon;
grant execute on function public.admin_conceder_creditos(uuid, integer, public.motivo_credito, text) to authenticated;

create or replace function public.admin_definir_admin(p_user uuid, p_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'apenas administradores' using errcode = '42501'; end if;
  update public.profiles set is_admin = p_admin where id = p_user;
end $$;
revoke all on function public.admin_definir_admin(uuid, boolean) from public, anon;
grant execute on function public.admin_definir_admin(uuid, boolean) to authenticated;

create or replace function public.admin_resumo()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then jsonb_build_object(
    'lotes_ativos',      (select count(*) from public.auctions where status = 'ativo'),
    'lotes_removidos',   (select count(*) from public.auctions where status = 'removido'),
    'usuarios',          (select count(*) from public.profiles),
    'premium',           (select count(*) from public.profiles where plano = 'premium'),
    'buscas_hoje',       (select count(*) from public.searches where created_at >= date_trunc('day', now())),
    'desbloqueios_hoje', (select count(*) from public.unlocks where created_at >= date_trunc('day', now())),
    'analises_pendentes',(select count(*) from public.analyses where status in ('aguardando','processando')),
    'analises_erro',     (select count(*) from public.analyses where status = 'erro'),
    'creditos_em_circulacao', (select coalesce(sum(delta),0) from public.credit_ledger)
  ) end;
$$;
revoke all on function public.admin_resumo() from public, anon;
grant execute on function public.admin_resumo() to authenticated;

create or replace function public.admin_listar_analises()
returns table (id uuid, status public.status_analise, pedido_em timestamptz, concluida_em timestamptz, erro text, modelo text, tokens integer,
               email text, auction_id uuid, titulo text)
language sql stable security definer set search_path = public as $$
  select a.id, a.status, a.pedido_em, a.concluida_em, a.erro, a.modelo, a.tokens, u.email::text, a.auction_id, au.titulo
    from public.analyses a join auth.users u on u.id = a.user_id join public.auctions au on au.id = a.auction_id
   where public.is_admin() order by a.pedido_em desc limit 200;
$$;
revoke all on function public.admin_listar_analises() from public, anon;
grant execute on function public.admin_listar_analises() to authenticated;

create or replace function public.admin_fontes()
returns setof public.fontes language sql stable security definer set search_path = public as $$
  select * from public.fontes where public.is_admin() order by id;
$$;
revoke all on function public.admin_fontes() from public, anon;
grant execute on function public.admin_fontes() to authenticated;

-- Dono do produto: administrador e Premium.
update public.profiles set is_admin = true, plano = 'premium'
 where id = (select id from auth.users where email = 'joaoaraujobusiness@gmail.com');
