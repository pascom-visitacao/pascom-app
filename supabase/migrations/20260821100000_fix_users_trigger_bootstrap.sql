-- ==========================================================================
-- enforce_users_self_update() barrava ate acesso direto via SQL Editor
-- (auth.uid() vem NULL fora do GoTrue/PostgREST, entao is_coordenacao()
-- sempre dava falso ali, mesmo pra quem tem controle total do banco).
-- Sem isso, nao existe forma de promover o primeiro coordenador.
-- Acesso direto ao Postgres ja e acesso irrestrito por definicao, entao
-- so pulamos a checagem quando nao ha sessao autenticada via API.
-- ==========================================================================

create or replace function enforce_users_self_update()
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
    if new.role is distinct from old.role or new.area_id is distinct from old.area_id then
      raise exception 'Apenas coordenacao geral pode alterar papel ou area';
    end if;
  end if;
  return new;
end;
$$;
