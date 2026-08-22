-- ==========================================================================
-- Fase 7.1 — Configurações do Coordenador
-- ==========================================================================

-- ---------------------------------------------------------------------
-- Proteção do "login mãe" (conta institucional): usa uma coluna
-- booleana em vez de comparar e-mail direto no trigger, pra não deixar
-- a proteção órfã se essa conta for renomeada um dia.
-- ---------------------------------------------------------------------
alter table users add column is_protected boolean not null default false;

-- conta institucional: promovida a coordenacao_geral e marcada como
-- protegida nesse mesmo UPDATE, antes do trigger existir - depois que
-- a proteção estiver ativa, ninguém mais consegue corrigir esse role.
update users
  set is_protected = true, role = 'coordenacao_geral'
  where email = 'pascomvisitacao@gmail.com';

create function enforce_protected_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_protected and new.role is distinct from old.role then
    raise exception 'Esta conta está protegida e não pode ter o papel alterado';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_protected_role
  before update on users
  for each row execute function enforce_protected_role();

-- ---------------------------------------------------------------------
-- Painel de redes sociais: só link de referência (ex: Bitwarden),
-- nunca credencial de verdade — decisão já tomada na spec.
-- ---------------------------------------------------------------------
create table social_media_accounts (
  id uuid primary key default gen_random_uuid(),
  platform_name text not null,
  reference_link text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table social_media_accounts enable row level security;

create policy "social_media: leitura para autenticados" on social_media_accounts
  for select to authenticated using (true);

create policy "social_media: escrita só coordenação" on social_media_accounts
  for all to authenticated
  using (is_coordenacao()) with check (is_coordenacao());
