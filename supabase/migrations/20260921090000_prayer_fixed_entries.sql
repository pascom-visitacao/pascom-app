-- Intenções fixas do cartão de oração diário (entradas sem tabela própria
-- hoje: o padre da paróquia, o Papa). Lista curta editável em
-- Configurações; mesmo padrão de RLS de parish_ministries.
create table prayer_fixed_entries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

alter table prayer_fixed_entries enable row level security;

create policy "oracao: leitura para autenticados" on prayer_fixed_entries
  for select to authenticated using (true);

create policy "oracao: escrita so coordenacao" on prayer_fixed_entries
  for all to authenticated
  using (is_coordenacao()) with check (is_coordenacao());

insert into prayer_fixed_entries (name) values ('Padre da paróquia'), ('Papa');

