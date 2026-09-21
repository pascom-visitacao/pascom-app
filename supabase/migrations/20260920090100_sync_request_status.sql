-- Sincroniza external_requests.status com o estado real das atividades
-- ligadas (activities.request_id). Uma única regra de derivação, usada
-- tanto pra UPDATE de status quanto pra DELETE de atividade:
--   nenhuma atividade sobrou            -> cancelado
--   todas as que sobraram concluídas    -> concluido
--   alguma ainda não concluída          -> recebido (reabre se estava concluido)
-- Só mexe em pedido 'recebido' (ou 'concluido' ao reabrir): nunca desfaz
-- 'cancelado' e nunca marca como cancelado um pedido já concluído.
-- SECURITY DEFINER pelo mesmo motivo de route_external_request: quem move
-- o card (ex.: responsável de fora da área) pode não ter UPDATE em
-- external_requests via RLS.
create function sync_request_status_from_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  if tg_op = 'DELETE' then
    v_request_id := old.request_id;
  else
    v_request_id := new.request_id;
  end if;

  if v_request_id is null then
    return null;
  end if;

  if not exists (select 1 from public.activities where request_id = v_request_id) then
    update public.external_requests set status = 'cancelado'
    where id = v_request_id and status = 'recebido';
  elsif not exists (
    select 1 from public.activities where request_id = v_request_id and status <> 'concluido'
  ) then
    update public.external_requests set status = 'concluido'
    where id = v_request_id and status = 'recebido';
  else
    update public.external_requests set status = 'recebido'
    where id = v_request_id and status = 'concluido';
  end if;

  return null;
end;
$$;

create trigger trg_sync_request_status_on_update
  after update of status on activities
  for each row
  when (old.status is distinct from new.status and new.request_id is not null)
  execute function sync_request_status_from_activity();

create trigger trg_sync_request_status_on_delete
  after delete on activities
  for each row
  when (old.request_id is not null)
  execute function sync_request_status_from_activity();

-- Backfill: pedidos que já ficaram "presos" em recebido.
-- Sem nenhuma atividade ligada (foi excluída) -> cancelado
update external_requests er set status = 'cancelado'
where er.status = 'recebido'
  and not exists (select 1 from activities a where a.request_id = er.id);

-- Todas as atividades ligadas já concluídas -> concluido
update external_requests er set status = 'concluido'
where er.status = 'recebido'
  and exists (select 1 from activities a where a.request_id = er.id)
  and not exists (select 1 from activities a where a.request_id = er.id and a.status <> 'concluido');

