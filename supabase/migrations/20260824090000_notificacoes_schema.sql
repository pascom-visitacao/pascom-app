-- ==========================================================================
-- Fase 5 (1/2): schema pras notificacoes por e-mail.
-- Cada coluna "*_notified_at" marca quando um aviso ja foi enviado,
-- pro cron nao mandar o mesmo e-mail toda vez que rodar.
-- ==========================================================================

alter table activities add column unassigned_notified_at timestamptz;
alter table activities add column due_date_reminder_sent_at timestamptz;
alter table schedules add column open_notified_at timestamptz;

-- Quando uma vaga e liberada (volta de atribuida pra aberta), reseta
-- o marcador pra ela ser notificada de novo - "vaga aberta" deve
-- avisar toda vez que abrir, nao so na primeira vez.
create function reset_schedule_notified_at()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null and old.user_id is not null then
    new.open_notified_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_reset_schedule_notified_at
  before update on schedules
  for each row execute function reset_schedule_notified_at();
