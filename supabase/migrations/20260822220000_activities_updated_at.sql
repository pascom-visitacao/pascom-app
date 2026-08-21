-- ==========================================================================
-- activities.updated_at, pro painel bento conseguir medir "concluidas
-- na semana" de verdade (created_at nao serve pra isso - uma activity
-- pode ter sido criada semanas atras e concluida agora).
-- ==========================================================================

alter table activities add column updated_at timestamptz not null default now();

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_activities_set_updated_at
  before update on activities
  for each row execute function set_updated_at();
