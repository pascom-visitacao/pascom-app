-- ==========================================================================
-- Fase 7.4 — Página de Perfil do usuário
-- ==========================================================================

alter table users
  add column phone text,
  add column bio text,
  add column skills text[] not null default '{}',
  add column social_links text[] not null default '{}';

-- Só as colunas de autoedição de perfil - role continua separado
-- (já concedido na Fase 7.2).
grant update (name, avatar_url, phone, bio, skills, social_links) on users to authenticated;

-- Estende o trigger existente: além de proteger "role" (só coordenação
-- altera, de qualquer um), agora também protege os campos de perfil,
-- mas com a regra invertida - só o próprio dono edita, NEM coordenação
-- edita por outra pessoa. RLS sozinha não resolve isso (a policy de
-- UPDATE em users é por linha, não por coluna - não dá pra ter uma
-- condição pra "role" e outra pra "bio" só com RLS).
create or replace function enforce_users_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_coordenacao() then
    if new.role is distinct from old.role then
      raise exception 'Apenas coordenação geral pode alterar papel';
    end if;
  end if;

  if auth.uid() is not null and auth.uid() is distinct from old.id and (
    new.name is distinct from old.name
    or new.avatar_url is distinct from old.avatar_url
    or new.phone is distinct from old.phone
    or new.bio is distinct from old.bio
    or new.skills is distinct from old.skills
    or new.social_links is distinct from old.social_links
  ) then
    raise exception 'Só é possível editar o próprio perfil';
  end if;

  return new;
end;
$$;

-- Foto de perfil: bucket público, upload restrito à própria pasta
-- ({user_id}/arquivo) - não solto na raiz do bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('perfil-fotos', 'perfil-fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "perfil-fotos: upload restrito à própria pasta"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'perfil-fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
