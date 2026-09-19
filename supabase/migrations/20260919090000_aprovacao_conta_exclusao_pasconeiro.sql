-- ==========================================================================
-- Aprovação de conta no primeiro login + exclusão (soft-delete) de
-- Pasconeiro com histórico preservado.
--
-- 'pending': recém-criado via OAuth, aguardando aprovação de Coordenação.
-- 'active': liberado, uso normal do app.
-- 'deleted': removido pela Coordenação - a linha continua existindo (pra
-- não quebrar assignee_id/user_id/holder_id/author_id já referenciados
-- em activities/schedules/equipment/activity_comments), só perde acesso.
-- ==========================================================================

create type account_status as enum ('pending', 'active', 'deleted');

alter table users
  add column account_status account_status not null default 'pending';

-- backfill: quem já usa o app não pode ficar travado esperando aprovação
-- retroativa
update users set account_status = 'active';

-- users já usa grant por coluna (Fase 7 multi-área) - sem isso, RLS
-- deixaria mas o Postgres ainda bloquearia o UPDATE direto
grant update (account_status) on users to authenticated;

-- ---------------------------------------------------------------------
-- Estende o trigger que já bloqueia autoedição de role: cobre
-- account_status também (senão um pendente conseguiria se autoaprovar
-- via update direto, já que a RLS de UPDATE já libera id = auth.uid()).
-- Segundo bloco, mesmo espírito do enforce_protected_role (Fase 7.1):
-- nem a coordenação exclui uma conta de coordenação ou protegida por
-- essa via - precisa rebaixar o papel primeiro, fluxo já existente.
-- ---------------------------------------------------------------------
create or replace function enforce_users_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_coordenacao() then
    if new.role is distinct from old.role or new.account_status is distinct from old.account_status then
      raise exception 'Apenas coordenação geral pode alterar papel ou status da conta';
    end if;
  end if;

  if new.account_status = 'deleted' and (old.role = 'coordenacao_geral' or old.is_protected) then
    raise exception 'Não é possível excluir uma conta de Coordenação geral ou protegida';
  end if;

  return new;
end;
$$;
