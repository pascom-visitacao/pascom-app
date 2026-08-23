-- ==========================================================================
-- Correção: assim como a policy de storage do calendario-paroquial (ver
-- 20260905090000), o tipo calendar_reference_period e a tabela
-- parish_calendar_files (definidos na migration original
-- 20260822200000_fase4_atividades_calendario.sql) também nunca chegaram
-- a ser criados de verdade neste banco - só o bucket de storage existia.
-- Testado ao vivo: upload de referência passava pelo Storage e quebrava
-- ao tentar inserir na tabela ("Could not find the table
-- 'public.parish_calendar_files' in the schema cache"). Recria
-- exatamente o que faltou.
-- ==========================================================================

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
