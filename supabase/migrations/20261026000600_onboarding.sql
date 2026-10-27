-- Gate de onboarding (modelo BuscaAii): na 1ª entrada o usuário assiste a um vídeo e informa 2 palavras-chave
-- ditas nele. Conteúdo (vídeo, textos, palavras) é configurável pelo admin e fica em `configuracoes`.
-- As palavras nunca saem para o cliente: a conferência é feita na RPC `concluir_onboarding`.

create table public.configuracoes (
  chave         text primary key,
  valor         jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.configuracoes enable row level security;
revoke all on public.configuracoes from anon, authenticated;
-- Sem policies: só as funções security definer abaixo leem/escrevem.

insert into public.configuracoes (chave, valor) values ('onboarding', jsonb_build_object(
  'titulo', 'Bem-vindo ao Veículo Sem Juros',
  'texto', 'Assista ao vídeo até o fim: ele explica como funcionam os créditos, a busca e o desbloqueio dos leilões. No final, informe as duas palavras-chave ditas no vídeo para liberar a plataforma.',
  'video_url', '',
  'palavras', jsonb_build_array('oportunidade', 'crédito')
));

-- Normaliza para comparar: minúsculas, sem acento, sem espaços nas pontas.
create or replace function public.normalizar_palavra(p text)
returns text language sql immutable as $$
  select trim(translate(lower(coalesce(p, '')),
    'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'));
$$;

-- O que o usuário logado pode ver: tudo menos as palavras.
create or replace function public.onboarding_publico()
returns jsonb language sql stable security definer set search_path = public as $$
  select (c.valor - 'palavras') || jsonb_build_object(
    'concluido', exists (select 1 from public.profiles p where p.id = auth.uid() and p.onboarding_done_at is not null))
    from public.configuracoes c where c.chave = 'onboarding';
$$;
revoke all on function public.onboarding_publico() from public, anon;
grant execute on function public.onboarding_publico() to authenticated;

-- Confere as duas palavras (em qualquer ordem) e marca o perfil como concluído.
create or replace function public.concluir_onboarding(p1 text, p2 text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  esperadas text[];
  dadas     text[];
begin
  if auth.uid() is null then raise exception 'sem sessão' using errcode = '42501'; end if;
  select array(select public.normalizar_palavra(x) from jsonb_array_elements_text(valor->'palavras') x order by 1)
    into esperadas from public.configuracoes where chave = 'onboarding';
  dadas := array(select unnest(array[public.normalizar_palavra(p1), public.normalizar_palavra(p2)]) order by 1);
  if esperadas is null or esperadas <> dadas then return false; end if;
  update public.profiles set onboarding_done_at = coalesce(onboarding_done_at, now()) where id = auth.uid();
  return true;
end $$;
revoke all on function public.concluir_onboarding(text, text) from public, anon;
grant execute on function public.concluir_onboarding(text, text) to authenticated;

-- Admin: lê e grava a configuração completa (com as palavras).
create or replace function public.admin_onboarding()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then (select valor from public.configuracoes where chave = 'onboarding') end;
$$;
revoke all on function public.admin_onboarding() from public, anon;
grant execute on function public.admin_onboarding() to authenticated;

create or replace function public.admin_definir_onboarding(p_valor jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'apenas administradores' using errcode = '42501'; end if;
  if jsonb_typeof(p_valor->'palavras') <> 'array' or jsonb_array_length(p_valor->'palavras') <> 2
     or exists (select 1 from jsonb_array_elements_text(p_valor->'palavras') x where public.normalizar_palavra(x) = '') then
    raise exception 'informe exatamente duas palavras-chave';
  end if;
  update public.configuracoes
     set valor = jsonb_build_object(
           'titulo', coalesce(p_valor->>'titulo', ''),
           'texto', coalesce(p_valor->>'texto', ''),
           'video_url', coalesce(p_valor->>'video_url', ''),
           'palavras', p_valor->'palavras'),
         atualizado_em = now()
   where chave = 'onboarding';
end $$;
revoke all on function public.admin_definir_onboarding(jsonb) from public, anon;
grant execute on function public.admin_definir_onboarding(jsonb) to authenticated;

-- Admin: zera o onboarding de um usuário (para ele ver o vídeo de novo).
create or replace function public.admin_reiniciar_onboarding(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'apenas administradores' using errcode = '42501'; end if;
  update public.profiles set onboarding_done_at = null where id = p_user;
end $$;
revoke all on function public.admin_reiniciar_onboarding(uuid) from public, anon;
grant execute on function public.admin_reiniciar_onboarding(uuid) to authenticated;
