-- ==========================================================================
-- Fase 4.6 — Notificações expandidas (2 novos gatilhos)
-- 1. Atividade atribuída diretamente pela Coordenação — síncrono, sem
--    schema novo em activities (RLS/trigger já permitem a troca de
--    assignee_id pela Coordenação desde a Fase 4).
-- 2. Lembrete de escala confirmada, véspera do evento — cron diário
--    reaproveitado (notify-deadline), precisa do mesmo padrão de
--    idempotência já usado pros outros 2 gatilhos existentes.
-- ==========================================================================

alter table schedules
  add column reminder_sent_at timestamptz;

-- Estende o reset já existente (que zera open_notified_at quando a vaga é
-- liberada) pra também zerar reminder_sent_at na mesma condição - se a
-- vaga for liberada e reassumida por outra pessoa, ela recebe o lembrete
-- de novo antes do evento, em vez de herdar o "já enviei" de quem desistiu.
create or replace function reset_schedule_notified_at()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null and old.user_id is not null then
    new.open_notified_at := null;
    new.reminder_sent_at := null;
  end if;
  return new;
end;
$$;
