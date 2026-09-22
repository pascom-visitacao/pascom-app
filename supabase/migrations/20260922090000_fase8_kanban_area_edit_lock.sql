-- ==========================================================================
-- Fase 8 - Kanban: trava a edicao de area_id pra coordenacao geral.
--
-- A policy de UPDATE de activities (20260830090000_fase7_multiplas_areas)
-- so restringe QUEM pode dar UPDATE numa linha (is_coordenacao() ou
-- assignee_id = auth.uid() ou area_id = any(my_area_ids())) - o WITH
-- CHECK nao trava o VALOR novo de area_id nesses dois ultimos casos:
-- um responsavel (assignee_id = auth.uid() bate sozinho) ou colega de
-- area (area_id novo só precisa bater com ALGUMA area do usuário, não
-- necessariamente a antiga) hoje já consegue technically mudar area_id
-- pra qualquer área.
--
-- Mesmo tipo de gap que a reatribuição tinha antes do trigger
-- enforce_activity_reassignment (fase4_atividades_calendario) - resolvido
-- do mesmo jeito: estende o MESMO trigger (já dispara em todo UPDATE de
-- activities) em vez de criar um segundo. O nome da função ficou
-- "reassignment" por historico; hoje ela cobre reatribuição de
-- responsável E mudança de área.
-- ==========================================================================

create or replace function enforce_activity_reassignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.assignee_id is distinct from old.assignee_id then
    if not is_coordenacao()
       and old.assignee_id is not null
       and old.assignee_id != auth.uid() then
      raise exception 'So quem ja e responsavel (ou coordenacao geral) pode reatribuir esta atividade';
    end if;
  end if;

  if new.area_id is distinct from old.area_id and not is_coordenacao() then
    raise exception 'So coordenacao geral pode mudar a area de uma atividade';
  end if;

  return new;
end;
$$;
