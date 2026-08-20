-- ==========================================================================
-- PASCOM — schema inicial
-- Tabelas (seção 4 do spec, + request_categories e external_requests.event_id
-- que faltavam no rascunho) e RLS para os 3 perfis: coordenacao_geral,
-- pasconeiro, solicitante externo (anon, sem login).
-- ==========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type user_role as enum ('coordenacao_geral', 'pasconeiro');

create type activity_status as enum ('a_fazer', 'em_producao', 'revisao', 'concluido');
create type activity_source as enum ('interna', 'pedido_externo');

-- status do pedido em si (não do card no kanban — isso é activities.status)
create type request_status as enum ('recebido', 'cancelado');

-- ---------------------------------------------------------------------
-- TABELAS
-- ---------------------------------------------------------------------

create table areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table request_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  area_id uuid not null references areas(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- 1:1 com auth.users; populada via trigger no signup (seção abaixo)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  avatar_url text,
  role user_role not null default 'pasconeiro',
  area_id uuid references areas(id) on delete set null,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date timestamptz not null,
  location text,
  description text,
  created_at timestamptz not null default now()
);

create table external_requests (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references request_categories(id) on delete restrict,
  description text not null,
  requester_name text not null,
  requester_contact text not null,
  deadline date,
  event_id uuid references events(id) on delete set null,
  status request_status not null default 'recebido',
  tracking_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  -- preenchido automaticamente a partir de request_categories.area_id (trigger),
  -- nunca aceito diretamente do cliente
  area_id uuid not null references areas(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status activity_status not null default 'a_fazer',
  area_id uuid not null references areas(id) on delete restrict,
  assignee_id uuid references users(id) on delete set null,
  due_date date,
  source activity_source not null default 'interna',
  request_id uuid references external_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

create table schedules (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  area_id uuid not null references areas(id) on delete restrict,
  role_needed text not null,
  user_id uuid references users(id) on delete set null,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table materials (
  id uuid primary key default gen_random_uuid(),
  drive_file_id text not null,
  name text not null,
  folder_path text,
  related_activity_id uuid references activities(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ÍNDICES (colunas usadas em filtro/join com frequência)
-- ---------------------------------------------------------------------
create index idx_users_area_id on users(area_id);
create index idx_request_categories_area_id on request_categories(area_id);
create index idx_external_requests_area_id on external_requests(area_id);
create index idx_external_requests_category_id on external_requests(category_id);
create index idx_activities_area_id on activities(area_id);
create index idx_activities_assignee_id on activities(assignee_id);
create index idx_activities_request_id on activities(request_id);
create index idx_activities_status on activities(status);
create index idx_schedules_event_id on schedules(event_id);
create index idx_schedules_area_id on schedules(area_id);
create index idx_schedules_user_id on schedules(user_id);
create index idx_materials_related_activity_id on materials(related_activity_id);

-- ==========================================================================
-- FUNÇÕES AUXILIARES (SECURITY DEFINER p/ evitar recursão de RLS)
-- ==========================================================================

create function is_coordenacao()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'coordenacao_geral'
  );
$$;

create function my_area_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select area_id from public.users where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Cria a linha em public.users quando alguém loga pela 1ª vez via
-- Google OAuth. role nasce 'pasconeiro'; promoção a coordenação geral
-- é manual.
-- ---------------------------------------------------------------------
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- Impede que quem não é coordenação altere o próprio papel/área
-- (RLS cuida de "pode dar update na linha"; isso cuida de "em quais
-- colunas").
-- ---------------------------------------------------------------------
create function enforce_users_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_coordenacao() then
    if new.role is distinct from old.role or new.area_id is distinct from old.area_id then
      raise exception 'Apenas coordenação geral pode alterar papel ou área';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_users_self_update
  before update on users
  for each row execute function enforce_users_self_update();

-- ---------------------------------------------------------------------
-- Roteamento automático (seção 3.5): força area_id a vir da categoria
-- (nunca do cliente) e, depois de inserido o pedido, cria o card no
-- Kanban já vinculado (activities.request_id), status inicial = 1ª
-- coluna do quadro ('a_fazer').
-- ---------------------------------------------------------------------
create function prepare_external_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select area_id into new.area_id from request_categories where id = new.category_id;
  return new;
end;
$$;

create trigger trg_prepare_external_request
  before insert on external_requests
  for each row execute function prepare_external_request();

create function route_external_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activities (title, description, status, area_id, source, request_id, due_date)
  select
    rc.name || ' — ' || new.requester_name,
    new.description,
    'a_fazer',
    new.area_id,
    'pedido_externo',
    new.id,
    new.deadline
  from request_categories rc
  where rc.id = new.category_id;
  return new;
end;
$$;

create trigger trg_route_external_request
  after insert on external_requests
  for each row execute function route_external_request();

-- ---------------------------------------------------------------------
-- Acompanhamento público por token — devolve o status "resolvido"
-- (o da activity vinculada, já que é ela que reflete o progresso real
-- no Kanban; cai pro status do pedido só se a activity não existir).
-- SECURITY DEFINER em vez de RLS com token: evita expor a tabela toda
-- pro anon e evita o token vazar via policy.
-- ---------------------------------------------------------------------
create function get_request_by_token(p_token text)
returns table (
  id uuid,
  category_name text,
  description text,
  deadline date,
  created_at timestamptz,
  request_status request_status,
  activity_status activity_status,
  current_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    er.id,
    rc.name as category_name,
    er.description,
    er.deadline,
    er.created_at,
    er.status as request_status,
    a.status as activity_status,
    coalesce(a.status::text, er.status::text) as current_status
  from external_requests er
  join request_categories rc on rc.id = er.category_id
  left join activities a on a.request_id = er.id
  where er.tracking_token = p_token;
$$;

grant execute on function get_request_by_token(text) to anon, authenticated;

-- ==========================================================================
-- ROW LEVEL SECURITY
-- ==========================================================================

alter table areas enable row level security;
alter table request_categories enable row level security;
alter table users enable row level security;
alter table events enable row level security;
alter table external_requests enable row level security;
alter table activities enable row level security;
alter table schedules enable row level security;
alter table materials enable row level security;

-- ---------- areas ----------
create policy "areas: leitura para autenticados" on areas
  for select to authenticated using (true);

create policy "areas: escrita só coordenação" on areas
  for all to authenticated
  using (is_coordenacao()) with check (is_coordenacao());

-- ---------- request_categories ----------
create policy "categorias: leitura pública" on request_categories
  for select to anon, authenticated using (true);

create policy "categorias: escrita só coordenação" on request_categories
  for all to authenticated
  using (is_coordenacao()) with check (is_coordenacao());

-- ---------- users ----------
create policy "users: leitura para autenticados" on users
  for select to authenticated using (true);

-- INSERT não tem policy: só a trigger handle_new_user (security definer)
-- consegue inserir; clientes não inserem direto.

create policy "users: cada um edita a própria linha, coordenação edita todas" on users
  for update to authenticated
  using (id = auth.uid() or is_coordenacao())
  with check (id = auth.uid() or is_coordenacao());

create policy "users: exclusão só coordenação" on users
  for delete to authenticated using (is_coordenacao());

-- ---------- events ----------
create policy "events: leitura para autenticados" on events
  for select to authenticated using (true);

create policy "events: escrita só coordenação" on events
  for all to authenticated
  using (is_coordenacao()) with check (is_coordenacao());

-- ---------- external_requests ----------
create policy "pedidos: envio público" on external_requests
  for insert to anon, authenticated with check (true);

create policy "pedidos: leitura para autenticados" on external_requests
  for select to authenticated using (true);

create policy "pedidos: atualização coordenação ou área dona" on external_requests
  for update to authenticated
  using (is_coordenacao() or area_id = my_area_id())
  with check (is_coordenacao() or area_id = my_area_id());

create policy "pedidos: exclusão só coordenação" on external_requests
  for delete to authenticated using (is_coordenacao());

-- (sem policy de select para anon — acompanhamento só via
-- get_request_by_token, que já roda com privilégio elevado)

-- ---------- activities ----------
create policy "activities: leitura para autenticados" on activities
  for select to authenticated using (true);

create policy "activities: criação coordenação ou área dona" on activities
  for insert to authenticated
  with check (is_coordenacao() or area_id = my_area_id());

create policy "activities: atualização coordenação, responsável ou área" on activities
  for update to authenticated
  using (is_coordenacao() or assignee_id = auth.uid() or area_id = my_area_id())
  with check (is_coordenacao() or assignee_id = auth.uid() or area_id = my_area_id());

create policy "activities: exclusão só coordenação" on activities
  for delete to authenticated using (is_coordenacao());

-- ---------- schedules ----------
create policy "schedules: leitura para autenticados" on schedules
  for select to authenticated using (true);

create policy "schedules: criação coordenação ou área dona" on schedules
  for insert to authenticated
  with check (is_coordenacao() or area_id = my_area_id());

create policy "schedules: atualização coordenação, área ou autoinscrição" on schedules
  for update to authenticated
  using (is_coordenacao() or area_id = my_area_id() or user_id = auth.uid())
  with check (is_coordenacao() or area_id = my_area_id() or user_id = auth.uid());

create policy "schedules: exclusão só coordenação" on schedules
  for delete to authenticated using (is_coordenacao());

-- ---------- materials ----------
create policy "materials: leitura para autenticados" on materials
  for select to authenticated using (true);

create policy "materials: criação para autenticados" on materials
  for insert to authenticated with check (true);

create policy "materials: atualização para autenticados" on materials
  for update to authenticated using (true) with check (true);

create policy "materials: exclusão só coordenação" on materials
  for delete to authenticated using (is_coordenacao());
