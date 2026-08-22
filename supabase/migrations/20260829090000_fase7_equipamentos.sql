-- ==========================================================================
-- Fase 7.3 — Página de Equipamentos
-- ==========================================================================

create table equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model text,
  photo_url text,
  holder_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table equipment enable row level security;

create policy "equipment: leitura para autenticados" on equipment
  for select to authenticated using (true);

create policy "equipment: criação só coordenação" on equipment
  for insert to authenticated with check (is_coordenacao());

create policy "equipment: atualização para autenticados" on equipment
  for update to authenticated using (true) with check (true);

create policy "equipment: exclusão só coordenação" on equipment
  for delete to authenticated using (is_coordenacao());

-- Impede que quem não é coordenação: (a) edite nome/modelo/foto,
-- (b) atribua o equipamento livre pra outra pessoa (só pra si mesmo),
-- (c) transfira um equipamento já com alguém direto pra outra pessoa
-- sem passar pela coordenação.
create function enforce_equipment_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if not is_coordenacao() then
    if new.name is distinct from old.name
      or new.model is distinct from old.model
      or new.photo_url is distinct from old.photo_url then
      raise exception 'Apenas coordenação geral pode editar os dados do equipamento';
    end if;

    if new.holder_id is distinct from old.holder_id then
      if new.holder_id is not null and new.holder_id != auth.uid() then
        raise exception 'Só é possível pegar o equipamento para si mesmo';
      end if;

      if old.holder_id is not null and old.holder_id != auth.uid() then
        raise exception 'Esse equipamento já está com outra pessoa';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_equipment_update
  before update on equipment
  for each row execute function enforce_equipment_update();

-- foto do equipamento: bucket público (leitura por URL direta), upload
-- só coordenação (mesmo padrão de pedidos-anexos/calendario-paroquial)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipamentos-fotos', 'equipamentos-fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "equipamentos-fotos: upload so coordenacao"
  on storage.objects
  for insert to authenticated
  with check (bucket_id = 'equipamentos-fotos' and is_coordenacao());
