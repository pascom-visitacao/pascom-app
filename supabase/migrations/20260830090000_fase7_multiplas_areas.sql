-- ==========================================================================
-- Fase 7.2 — Múltiplas áreas por Pasconeiro (self-service)
--
-- Substitui users.area_id (singular, só coordenação editava) por um
-- sistema de auto-seleção com até 3 áreas, primeira escolha imediata,
-- ajustes seguintes com cooldown de 3 dias e efetivação 24h depois.
-- ==========================================================================

alter table users
  add column area_ids uuid[] not null default '{}',
  add column pending_area_ids uuid[],
  add column areas_submitted_at timestamptz;

-- migra dado existente antes de derrubar a coluna antiga - sem isso,
-- todo mundo que já tem área hoje perde essa informação silenciosamente
update users set area_ids = array[area_id] where area_id is not null;

-- ---------------------------------------------------------------------
-- Leitura do conjunto vigente (considera o pendente já ter "vencido"
-- as 24h, sem precisar de cron pra promover). effective_area_ids()
-- recebe o usuário como parâmetro pra servir tanto RLS (via
-- my_area_ids()) quanto telas administrativas olhando outro usuário.
-- ---------------------------------------------------------------------
create function effective_area_ids(p_user_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when pending_area_ids is not null and areas_submitted_at <= now() - interval '24 hours'
      then pending_area_ids
    else coalesce(area_ids, '{}')
  end
  from public.users where id = p_user_id;
$$;

create function my_area_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select effective_area_ids(auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Envio de nova seleção - toda a lógica de negócio mora aqui, chamada
-- pelo próprio usuário via RPC. Nenhum client deve escrever
-- area_ids/pending_area_ids/areas_submitted_at direto (ver REVOKE
-- abaixo) - só essa função tem esse poder.
-- ---------------------------------------------------------------------
create function submit_area_selection(new_area_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current uuid[];
  v_submitted_at timestamptz;
  v_pending uuid[];
  v_removed uuid[];
  v_deduped uuid[];
  v_blocking text;
begin
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  select area_ids, pending_area_ids, areas_submitted_at
    into v_current, v_pending, v_submitted_at
    from users where id = v_user_id;

  -- settle: se o pendente já venceu, promove antes de validar contra ele
  if v_pending is not null and v_submitted_at <= now() - interval '24 hours' then
    v_current := v_pending;
    update users set area_ids = v_current, pending_area_ids = null where id = v_user_id;
  end if;

  v_deduped := array(select distinct u from unnest(new_area_ids) u order by u);

  if array_length(v_deduped, 1) is not null and array_length(v_deduped, 1) > 3 then
    raise exception 'Máximo de 3 áreas.';
  end if;

  if exists (select 1 from unnest(v_deduped) a where a not in (select id from areas)) then
    raise exception 'Área inválida.';
  end if;

  if v_submitted_at is null then
    -- primeira vez: vale na hora, sem cooldown (nada pra esperar ainda)
    update users set area_ids = v_deduped, pending_area_ids = null, areas_submitted_at = now()
      where id = v_user_id;
    return;
  end if;

  if now() - v_submitted_at < interval '3 days' then
    raise exception 'Só é possível ajustar a seleção 3 dias após o último envio.';
  end if;

  v_removed := array(select unnest(v_current) except select unnest(v_deduped));

  if v_removed is not null and array_length(v_removed, 1) > 0 then
    select string_agg(distinct a.name, ', ') into v_blocking
      from areas a
      where a.id = any(v_removed)
        and (
          exists (
            select 1 from activities act
            where act.assignee_id = v_user_id
              and act.area_id = a.id
              and act.status != 'concluido'
          )
          or exists (
            select 1 from schedules sch
            where sch.user_id = v_user_id
              and sch.area_id = a.id
              and sch.confirmed = true
          )
        );

    if v_blocking is not null then
      raise exception 'Não é possível remover % — você tem atividade(s) ou vaga(s) confirmada(s) nessa área.', v_blocking;
    end if;
  end if;

  -- ajuste (não primeira vez): vira pendente, só efetiva em 24h; esse
  -- mesmo envio reinicia o cooldown de 3 dias pro próximo ajuste
  update users set pending_area_ids = v_deduped, areas_submitted_at = now()
    where id = v_user_id;
end;
$$;

grant execute on function submit_area_selection(uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- Trigger antigo protegia role E area_id contra edição por quem não é
-- coordenação. area_id não existe mais (coluna cai no fim deste
-- arquivo) - mantém só a checagem de role.
-- ---------------------------------------------------------------------
create or replace function enforce_users_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_coordenacao() then
    if new.role is distinct from old.role then
      raise exception 'Apenas coordenação geral pode alterar papel';
    end if;
  end if;
  return new;
end;
$$;

-- Privilégio de coluna, não trigger: um trigger bloquearia também a
-- escrita legítima feita de DENTRO de submit_area_selection (a função
-- SECURITY DEFINER roda como o dono da função, mas o trigger não
-- diferencia "veio de dentro da RPC" de "veio direto do cliente" -
-- ambos chegam como a mesma UPDATE na tabela).
--
-- REVOKE de coluna sozinho não bastaria: authenticated já tem UPDATE
-- de TABELA INTEIRA (20260821090000_grant_table_privileges.sql), que
-- cobre qualquer coluna nova automaticamente - revogar só na coluna
-- não tira o que a tabela inteira já concede. Por isso: revoga o
-- UPDATE de tabela inteira e devolve especificamente só "role" (única
-- coluna que authenticated ainda precisa editar direto hoje, via
-- /areas). area_ids/pending_area_ids/areas_submitted_at ficam sem
-- nenhuma concessão de update pra authenticated - só a função
-- (rodando com o privilégio do dono, não do authenticated) consegue
-- escrever nelas.
revoke update on users from authenticated;
grant update (role) on users to authenticated;

-- ---------------------------------------------------------------------
-- Migra as 5 policies que usavam my_area_id() (singular) pra
-- my_area_ids() (plural, considera todas as áreas do usuário)
-- ---------------------------------------------------------------------
drop policy "pedidos: atualização coordenação ou área dona" on external_requests;
create policy "pedidos: atualização coordenação ou área dona" on external_requests
  for update to authenticated
  using (is_coordenacao() or area_id = any(my_area_ids()))
  with check (is_coordenacao() or area_id = any(my_area_ids()));

drop policy "activities: criação coordenação ou área dona" on activities;
create policy "activities: criação coordenação ou área dona" on activities
  for insert to authenticated
  with check (
    is_coordenacao()
    or (area_id = any(my_area_ids()) and (assignee_id is null or assignee_id = auth.uid()))
  );

drop policy "activities: atualização coordenação, responsável ou área" on activities;
create policy "activities: atualização coordenação, responsável ou área" on activities
  for update to authenticated
  using (is_coordenacao() or assignee_id = auth.uid() or area_id = any(my_area_ids()))
  with check (is_coordenacao() or assignee_id = auth.uid() or area_id = any(my_area_ids()));

drop policy "schedules: criação coordenação ou área dona" on schedules;
create policy "schedules: criação coordenação ou área dona" on schedules
  for insert to authenticated
  with check (is_coordenacao() or area_id = any(my_area_ids()));

drop policy "schedules: atualização coordenação, área ou autoinscrição" on schedules;
create policy "schedules: atualização coordenação, área ou autoinscrição" on schedules
  for update to authenticated
  using (is_coordenacao() or area_id = any(my_area_ids()) or user_id = auth.uid())
  with check (is_coordenacao() or area_id = any(my_area_ids()) or user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Aposenta o modelo antigo - nada mais referencia my_area_id() nem
-- users.area_id depois das migrações acima.
-- ---------------------------------------------------------------------
drop function my_area_id();
alter table users drop column area_id;
