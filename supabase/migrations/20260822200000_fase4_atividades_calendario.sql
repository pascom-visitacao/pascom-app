-- ==========================================================================
-- Fase 4 (escopo ampliado): prioridade/evento/ministerio em activities,
-- parish_ministries, referencia do calendario paroquial, e uma correcao
-- de RLS que nao tinha sido pensada ate agora: impedir que alguem "roube"
-- uma activity/vaga ja atribuida a outro pasconeiro da mesma area sem
-- ela ser liberada primeiro.
-- ==========================================================================

-- ---------------------------------------------------------------------
-- parish_ministries — mesmo padrao de areas/request_categories
-- ---------------------------------------------------------------------
create table parish_ministries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table parish_ministries enable row level security;

create policy "ministerios: leitura para autenticados" on parish_ministries
  for select to authenticated using (true);

create policy "ministerios: escrita so coordenacao" on parish_ministries
  for all to authenticated
  using (is_coordenacao()) with check (is_coordenacao());

-- ---------------------------------------------------------------------
-- activities: prioridade, evento relacionado, ministerio da paroquia
-- ---------------------------------------------------------------------
create type activity_priority as enum ('baixa', 'media', 'alta');

alter table activities add column priority activity_priority not null default 'media';
alter table activities add column event_id uuid references events(id) on delete set null;
alter table activities add column parish_ministry_id uuid references parish_ministries(id) on delete set null;

create index idx_activities_event_id on activities(event_id);
create index idx_activities_parish_ministry_id on activities(parish_ministry_id);

-- route_external_request criava a activity mas nao herdava o event_id
-- do pedido externo — corrigindo pra cumprir o que o formulario publico
-- ja captura desde a Fase 3.
create or replace function route_external_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activities (title, description, status, area_id, source, request_id, due_date, event_id)
  select
    rc.name || ' — ' || new.requester_name,
    new.description,
    'a_fazer',
    new.area_id,
    'pedido_externo',
    new.id,
    new.deadline,
    new.event_id
  from request_categories rc
  where rc.id = new.category_id;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Correcao de RLS: reatribuir activity/vaga so quem ja e o dono (ou
-- estava vazia), ou coordenacao geral. A policy ampla de area continua
-- liberando status/outros campos pra qualquer um da area — isso aqui
-- so trava a troca especifica de assignee_id/user_id.
-- ---------------------------------------------------------------------

create function enforce_activity_reassignment()
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

  return new;
end;
$$;

create trigger trg_enforce_activity_reassignment
  before update on activities
  for each row execute function enforce_activity_reassignment();

create function enforce_schedule_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.user_id is distinct from old.user_id then
    if not is_coordenacao()
       and old.user_id is not null
       and old.user_id != auth.uid() then
      raise exception 'So quem ja esta na vaga (ou coordenacao geral) pode altera-la';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_schedule_assignment
  before update on schedules
  for each row execute function enforce_schedule_assignment();

-- ---------------------------------------------------------------------
-- Calendario paroquial: referencia (PDF/foto) que a coordenacao sobe
-- pra consultar e criar eventos manualmente. Privado por padrao.
-- ---------------------------------------------------------------------
create type calendar_reference_period as enum ('anual', 'mensal');

create table parish_calendar_files (
  id uuid primary key default gen_random_uuid(),
  period_type calendar_reference_period not null,
  reference_year smallint not null,
  reference_month smallint check (reference_month between 1 and 12),
  file_path text not null,
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table parish_calendar_files enable row level security;

create policy "calendario paroquial: so coordenacao" on parish_calendar_files
  for all to authenticated
  using (is_coordenacao()) with check (is_coordenacao());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'calendario-paroquial',
  'calendario-paroquial',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "calendario-paroquial: acesso so coordenacao"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'calendario-paroquial' and is_coordenacao())
  with check (bucket_id = 'calendario-paroquial' and is_coordenacao());
